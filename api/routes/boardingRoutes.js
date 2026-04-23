import fs from 'fs';
import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// --- 1. Multer Setup for Image Uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// --- 2. AI Description Generator Route ---
router.post('/generate-description', async (req, res) => {
    try {
        const { features } = req.body; 
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Write a short, engaging, and professional real estate description for a student boarding place with the following features: ${features}. Keep it under 2 paragraphs and highlight its appeal to university students.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ description: text });
    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ message: "Failed to generate description" });
    }
});

// --- 2.5 AI Image Verification & Auto-Tagging ---
router.post('/verify-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No image uploaded for verification" });

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const imagePath = req.file.path;
        const mimeType = req.file.mimetype;
        const imagePart = {
            inlineData: { data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"), mimeType }
        };

        const prompt = `Analyze this image. Is it a legitimate interior of a room, house, or boarding place? What furniture or amenities are visible? 
        Respond STRICTLY in JSON format with no markdown formatting or extra text. Example:
        { "isLegitimate": true, "tags": ["Bed", "Desk"] }`;

        const result = await model.generateContent([prompt, imagePart]);
        const cleanJsonString = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const verificationData = JSON.parse(cleanJsonString);

        fs.unlinkSync(imagePath);
        res.status(200).json(verificationData);
    } catch (error) {
        console.error("AI Image Scan Error:", error);
        res.status(500).json({ message: "Failed to scan image" });
    }
});

// --- 3. Add New Boarding (Prisma Mapped) ---
router.post('/add', upload.array('images', 5), async (req, res) => {
    try {
        const { ownerId, title, description, price, location, genderAllowed, facilities, capacity } = req.body;
        const imagePaths = req.files ? req.files.map(file => file.path) : [];

        let mappedGender = 'any';
        if (genderAllowed === 'Male') mappedGender = 'male';
        if (genderAllowed === 'Female') mappedGender = 'female';

        let user = await prisma.user.findUnique({ where: { id: ownerId } });
        if (!user) {
            user = await prisma.user.create({
                data: { 
                    id: ownerId, email: `owner_${Date.now()}@test.com`, 
                    username: `owner_${Date.now()}`, password: "hashed_password", role: "boardingOwner" 
                }
            });
        }

        const newPost = await prisma.post.create({
            data: {
                ownerId: user.id,
                title: title,
                rent: parseInt(price) || 0, 
                address: location,          
                images: imagePaths,
                preferredTenantGender: mappedGender,
                city: "Colombo", 
                latitude: "0.0",
                longitude: "0.0",
                boardingType: "singleRoom",
                capacity: parseInt(capacity) || 1,
                status: "available",
                postDetail: {
                    create: {
                        description: description || "",
                        rules: facilities || ""
                    }
                }
            },
            include: { postDetail: true }
        });

        res.status(201).json({ message: "Boarding added successfully!", boarding: newPost });
    } catch (error) {
        console.error("Error adding boarding:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// --- 4. Get All Boardings (Prisma Mapped) ---
router.get('/', async (req, res) => {
    try {
        const posts = await prisma.post.findMany({
            include: { postDetail: true },
            orderBy: { createdAt: 'desc' }
        });

        const formattedBoardings = posts.map(post => ({
            _id: post.id,
            title: post.title,
            description: post.postDetail?.description || "",
            price: post.rent,
            location: post.address,
            genderAllowed: post.preferredTenantGender,
            status: post.status === 'available' ? 'Available' : 'Full',
            capacity: post.capacity,
            images: post.images
        }));

        res.status(200).json(formattedBoardings);
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// --- 5. Update Boarding Status & Smart Waitlist Trigger ---
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body; 
        const boardingId = req.params.id;
        
        const prismaStatus = status === 'Available' ? 'available' : 'full';

        const updatedPost = await prisma.post.update({
            where: { id: boardingId },
            data: { status: prismaStatus }
        });

        let notifiedStudents = [];

        if (prismaStatus === 'available') {
            const waitingList = await prisma.watchlist.findMany({
                where: { postId: boardingId, isActive: true },
                include: { user: true }
            });

            if (waitingList.length > 0) {
                console.log(`\n🔔 ALERT: Boarding ${boardingId} is available!`);

                for (let entry of waitingList) {
                    console.log(`✉️ Sending email to: ${entry.user.fullName || entry.user.username} (${entry.user.email})`);
                    notifiedStudents.push(entry.user.email);

                    await prisma.watchlist.update({
                        where: { id: entry.id },
                        data: { isActive: false }
                    });
                }
                console.log(`✅ Successfully notified ${notifiedStudents.length} students.\n`);
            }
        }

        res.status(200).json({ message: `Status updated`, notifiedCount: notifiedStudents.length });
    } catch (error) {
        console.error("Status Update Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// --- 6. Join the Waitlist (For Students) ---
router.post('/:id/waitlist', async (req, res) => {
    try {
        const { studentName, studentEmail } = req.body; 
        const boardingId = req.params.id;

        let student = await prisma.user.findUnique({ where: { email: studentEmail } });
        
        if (!student) {
            student = await prisma.user.create({
                data: {
                    email: studentEmail,
                    username: studentEmail.split('@')[0] + Date.now().toString().slice(-4),
                    fullName: studentName,
                    password: "default_password",
                    role: "student"
                }
            });
        }

        const existingEntry = await prisma.watchlist.findFirst({
            where: { userId: student.id, postId: boardingId, isActive: true }
        });

        if (existingEntry) {
             return res.status(400).json({ message: "You are already on the waitlist!" });
        }

        await prisma.watchlist.create({
            data: { userId: student.id, postId: boardingId, isActive: true }
        });

        res.status(201).json({ message: "Successfully added to the waitlist!" });
    } catch (error) {
        console.error("Waitlist Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// --- 7. Get Waitlist for a specific boarding (Owner Action) ---
router.get('/:id/waitlist', async (req, res) => {
  try {
    const list = await prisma.watchlist.findMany({
        where: { postId: req.params.id, isActive: true },
        include: { user: true },
        orderBy: { createdAt: 'asc' }
    });

    const formattedList = list.map(item => ({
        _id: item.id,
        studentName: item.user.fullName || item.user.username,
        studentEmail: item.user.email,
        createdAt: item.createdAt
    }));

    res.json(formattedList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching waitlist" });
  }
});

// --- 8. DELETE a boarding listing ---
router.delete('/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    await prisma.postDetail.delete({ where: { postId: postId } }).catch(() => {});
    await prisma.post.delete({ where: { id: postId } });
    
    res.json({ message: "Boarding deleted successfully!" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Server error while deleting" });
  }
});

// --- 9. UPDATE a boarding listing ---
router.put('/:id', upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, price, location, genderAllowed, features, capacity } = req.body;
    const postId = req.params.id;
    
    const updateData = {};
    if (title) updateData.title = title;
    if (price) updateData.rent = parseInt(price);
    if (location) updateData.address = location;
    if (genderAllowed) updateData.preferredTenantGender = genderAllowed.toLowerCase() === 'any' ? 'any' : genderAllowed.toLowerCase();
    if (capacity) updateData.capacity = parseInt(capacity);
    
    if (req.files && req.files.length > 0) {
        updateData.images = req.files.map(file => file.path);
    }

    const updatedPost = await prisma.post.update({
        where: { id: postId },
        data: updateData
    });

    if (description || features) {
        await prisma.postDetail.update({
            where: { postId: postId },
            data: {
                description: description !== undefined ? description : undefined,
                rules: features !== undefined ? features : undefined
            }
        }).catch(() => {}); 
    }

    res.json({ message: "Updated successfully", post: updatedPost });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Server error while updating" });
  }
});

export default router;