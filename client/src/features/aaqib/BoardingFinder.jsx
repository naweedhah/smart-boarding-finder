import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // 🚨 Added for SPA navigation
import { Sparkles, MapPin, Users, Home, PlusCircle, LayoutDashboard, Edit2, X, ShieldCheck, AlertTriangle } from 'lucide-react';

function App() {
  const navigate = useNavigate(); // 🚨 Initialize navigation hook
  const [activeTab, setActiveTab] = useState('browse'); 
  const [formData, setFormData] = useState({ title: '', location: '', price: '', genderAllowed: 'Any', features: '', description: '' });
  const [images, setImages] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  
  const [isVerifyingImage, setIsVerifyingImage] = useState(false);
  const [aiTags, setAiTags] = useState([]);
  const [isImageLegit, setIsImageLegit] = useState(null);

  const [waitlistData, setWaitlistData] = useState([]);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [showAIWarning, setShowAIWarning] = useState(false);

  // --- NEW: Booking & Waitlist Redirection States ---
  const [showRoomSelection, setShowRoomSelection] = useState(false);
  const [selectedBoardingId, setSelectedBoardingId] = useState(null);
  
  const [showJoinWaitlistModal, setShowJoinWaitlistModal] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ name: '', email: '' });
  const [targetBoardingId, setTargetBoardingId] = useState(null);

  const fetchListings = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/boardings');
      setMyListings(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { 
    if (activeTab === 'dashboard' || activeTab === 'browse') fetchListings(); 
  }, [activeTab]);

  const generateAIDescription = async () => {
    if (!formData.features) return alert("Please enter features!");
    setLoadingAI(true);
    try {
      const res = await axios.post('http://localhost:5001/api/boardings/generate-description', { features: formData.features });
      setFormData({ ...formData, description: res.data.description });
    } catch (err) { alert("AI Error"); }
    setLoadingAI(false);
  };

  const verifyImageWithAI = async () => {
    if (images.length === 0) return alert("Please select an image first!");
    
    setIsVerifyingImage(true);
    const data = new FormData();
    data.append('image', images[0]); 

    try {
      const res = await axios.post('http://localhost:5001/api/boardings/verify-image', data);
      
      if (res.data.isLegitimate) {
        setIsImageLegit(true);
        setAiTags(res.data.tags);
        setFormData({ ...formData, features: formData.features + (formData.features ? ", " : "") + res.data.tags.join(', ') });
      } else {
        setIsImageLegit(false);
        setAiTags([]);
        setShowAIWarning(true);
      }
    } catch (err) {
      alert("AI Image Scan Failed.");
    }
    setIsVerifyingImage(false);
  };

  const handleEditClick = (item) => {
    setEditingId(item._id);
    setFormData({
      title: item.title,
      location: item.location,
      price: item.price,
      genderAllowed: item.genderAllowed || 'Any',
      features: '', 
      description: item.description
    });
    setIsImageLegit(null);
    setAiTags([]);
    setImages([]); 
    setActiveTab('add'); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    images.forEach(img => data.append('images', img));

    if (editingId) {
      try {
        await axios.put(`http://localhost:5001/api/boardings/${editingId}`, data);
        alert("Listing Updated Successfully!");
        setEditingId(null); 
        setFormData({ title: '', location: '', price: '', genderAllowed: 'Any', features: '', description: '' }); 
        setImages([]);
        setActiveTab('dashboard'); 
      } catch (err) { alert("Failed to update."); }
    } else {
      data.append('ownerId', '64a7c9f8e4b0a1c2d3e4f5a6'); 
      try {
        await axios.post('http://localhost:5001/api/boardings/add', data);
        alert("Boarding Published!");
        setFormData({ title: '', location: '', price: '', genderAllowed: 'Any', features: '', description: '' });
        setImages([]);
        setIsImageLegit(null);
        setAiTags([]);
        setActiveTab('dashboard'); 
      } catch (err) { alert("Error adding."); }
    }
  };

  const handleContactClick = (id) => {
    setSelectedBoardingId(id);
    setShowRoomSelection(true);
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Available' ? 'Full' : 'Available';
    await axios.patch(`http://localhost:5001/api/boardings/${id}/status`, { status: newStatus });
    fetchListings();
  };

  const deleteListing = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this listing?")) {
      try {
        await axios.delete(`http://localhost:5001/api/boardings/${id}`);
        alert("Listing deleted successfully.");
        fetchListings(); 
      } catch (err) { alert("Failed to delete."); }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', location: '', price: '', genderAllowed: 'Any', features: '', description: '' });
    setActiveTab('dashboard');
  };

  // --- NEW: Improved Custom Waitlist Logic ---
  const joinWaitlist = (boardingId) => {
    setTargetBoardingId(boardingId);
    setShowJoinWaitlistModal(true);
  };

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://localhost:5001/api/boardings/${targetBoardingId}/waitlist`, {
        studentName: waitlistForm.name,
        studentEmail: waitlistForm.email
      });
      alert("You have been added to the waitlist!");
      setShowJoinWaitlistModal(false);
      setWaitlistForm({ name: '', email: '' });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to join waitlist.");
    }
  };

  const viewWaitlist = async (boardingId) => {
    try {
      const res = await axios.get(`http://localhost:5001/api/boardings/${boardingId}/waitlist`);
      setWaitlistData(res.data);
      setShowWaitlistModal(true);
    } catch (err) { alert("Failed to fetch waitlist."); }
  };

  return (
    <div className="min-h-screen bg-[#FCF5F3] font-sans text-[#605853]">
      
      <nav className="bg-[#FFFFFF] border-b border-[#E0E0E0] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div onClick={() => setActiveTab('browse')} className="flex items-center gap-2 font-bold text-[#008080] text-xl cursor-pointer hover:opacity-80 transition">
            <Home size={24}/> <span>Boarding Finder</span>
          </div>
          <div className="flex gap-2 md:gap-4 overflow-x-auto">
            <button onClick={() => setActiveTab('browse')} className={`flex items-center justify-center gap-2 px-4 h-12 rounded-xl text-sm font-bold transition ${activeTab === 'browse' ? 'bg-[#008080] text-[#FFFFFF]' : 'text-[#605853] hover:bg-[#F2EBE8]'}`}>Browse</button>
            <button onClick={() => { setActiveTab('add'); setEditingId(null); setFormData({ title: '', location: '', price: '', genderAllowed: 'Any', features: '', description: '' }); }} className={`flex items-center justify-center gap-2 px-4 h-12 rounded-xl text-sm font-bold transition ${activeTab === 'add' ? 'bg-[#008080] text-[#FFFFFF]' : 'text-[#605853] hover:bg-[#F2EBE8]'}`}><PlusCircle size={18}/> Add Listing</button>
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center justify-center gap-2 px-4 h-12 rounded-xl text-sm font-bold transition ${activeTab === 'dashboard' ? 'bg-[#008080] text-[#FFFFFF]' : 'text-[#605853] hover:bg-[#F2EBE8]'}`}><LayoutDashboard size={18}/> Dashboard</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-4 relative">
        
        {activeTab === 'browse' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <div className="bg-[#008080] rounded-3xl p-6 md:p-8 text-center text-[#FFFFFF] shadow-xl">
              <h1 className="text-3xl md:text-5xl font-extrabold mb-4">Find Your Perfect Boarding</h1>
              <p className="text-[#BED9D8] text-base md:text-lg max-w-2xl mx-auto">Browse AI-verified listings exclusively for SLIIT students.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myListings.length === 0 ? (
                <p className="text-center text-[#7E736D] col-span-full py-10">No boardings available yet.</p>
              ) : myListings.map(item => (
                <div key={item._id} className="bg-[#FFFFFF] rounded-3xl overflow-hidden shadow-lg border border-[#E0E0E0] flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  
                  <div className="h-48 bg-[#F2EBE8] relative border-b border-[#E0E0E0] overflow-hidden">
                    {item.images && item.images.length > 0 ? (
                      <img 
                        src={`http://localhost:5001/${item.images[0].replace(/\\/g, '/')}`} 
                        alt={item.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[#999999]">
                        <Home size={48} opacity={0.5} />
                      </div>
                    )}
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-xl text-xs font-black uppercase shadow-sm tracking-wide border ${item.status === 'Available' ? 'bg-[#BED9D8] text-[#008080] border-[#008080]/30' : 'bg-[#C1121F]/10 text-[#C1121F] border-[#C1121F]/20'}`}>
                      {item.status}
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-[#332D2A] line-clamp-1">{item.title}</h3>
                    <p className="text-sm text-[#008080] font-bold mb-4 flex items-center gap-1"><MapPin size={16}/> {item.location}</p>
                    <p className="text-sm text-[#605853] mb-6 line-clamp-3 flex-1 leading-relaxed"><Sparkles size={14} className="inline text-[#FECE51] mr-1"/>{item.description}</p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#E0E0E0]">
                      <div>
                        <p className="text-xs text-[#7E736D] font-bold uppercase tracking-wider mb-1">Monthly</p>
                        <p className="text-xl font-black text-[#332D2A]">Rs. {item.price}</p>
                      </div>
                      {item.status === 'Available' ? (
                        <button 
                          onClick={() => handleContactClick(item._id)}
                          className="bg-[#FECE51] hover:bg-[#F7C14B] text-[#332D2A] px-5 h-12 rounded-2xl text-sm font-bold transition shadow-md active:scale-95"
                        >
                          Contact
                        </button>
                      ) : (
                        <button onClick={() => joinWaitlist(item._id)} className="bg-[#332D2A] hover:bg-[#2F2A27] text-[#FFFFFF] px-5 h-12 rounded-2xl text-sm font-bold transition shadow-md flex items-center justify-center gap-2 active:scale-95"><Users size={16}/> Notify Me</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADD / EDIT LISTING PAGE */}
        {activeTab === 'add' && (
          <div className="bg-[#FFFFFF] rounded-3xl shadow-xl border border-[#E0E0E0] animate-in fade-in duration-500">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-[#332D2A]">{editingId ? 'Edit Listing' : 'Create New Listing'}</h2>
                <p className="text-[#7E736D] text-sm">{editingId ? 'Update your existing details' : 'Fill in the details for SLIIT students'}</p>
              </div>
              {editingId && <button onClick={cancelEdit} className="text-sm font-bold text-[#7E736D] hover:text-[#C1121F]">Cancel Edit</button>}
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              <div className="bg-[#F2EBE8] p-6 rounded-2xl border border-[#E0E0E0] space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="font-bold text-[#332D2A] block mb-1">
                      {editingId ? "Change Photos (Optional)" : "Upload Room Photos"}
                    </label>
                    <input type="file" multiple className="text-sm text-[#7E736D] w-full" onChange={(e) => {
                        setImages([...e.target.files]);
                        setIsImageLegit(null);
                        setAiTags([]);
                      }} 
                    />
                  </div>
                  <button type="button" onClick={verifyImageWithAI} disabled={images.length === 0 || isVerifyingImage} className={`px-5 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${images.length > 0 ? 'bg-[#008080] text-[#FFFFFF] hover:opacity-90' : 'bg-[#BED9D8] text-[#FFFFFF] cursor-not-allowed'}`}>
                    <Sparkles size={16}/> {isVerifyingImage ? "Scanning..." : "AI Vision Scan"}
                  </button>
                </div>

                {isImageLegit !== null && (
                  <div className={`p-4 rounded-xl border ${isImageLegit ? 'bg-[#BED9D8]/30 border-[#008080]/30' : 'bg-[#C1121F]/10 border-[#C1121F]/30'}`}>
                    <p className={`font-bold text-sm mb-2 flex items-center gap-1 ${isImageLegit ? 'text-[#008080]' : 'text-[#C1121F]'}`}>
                      {isImageLegit ? <ShieldCheck size={18}/> : <AlertTriangle size={18}/>}
                      {isImageLegit ? 'AI Verified Interior' : 'AI Flagged: Invalid Image'}
                    </p>
                    {aiTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {aiTags.map((tag, idx) => (
                          <span key={idx} className="bg-[#BED9D8] text-[#008080] px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" value={formData.title} placeholder="Title" className="border border-[#E0E0E0] p-3 rounded-2xl outline-none focus:ring-2 focus:ring-[#008080] h-12" onChange={(e) => setFormData({...formData, title: e.target.value})} />
                <input type="text" value={formData.location} placeholder="Location" className="border border-[#E0E0E0] p-3 rounded-2xl outline-none focus:ring-2 focus:ring-[#008080] h-12" onChange={(e) => setFormData({...formData, location: e.target.value})} />
                <input type="number" value={formData.price} placeholder="Monthly Price" className="border border-[#E0E0E0] p-3 rounded-2xl outline-none focus:ring-2 focus:ring-[#008080] h-12" onChange={(e) => setFormData({...formData, price: e.target.value})} />
                <select value={formData.genderAllowed} className="border border-[#E0E0E0] p-3 rounded-2xl outline-none bg-[#FFFFFF] h-12" onChange={(e) => setFormData({...formData, genderAllowed: e.target.value})}>
                  <option value="Any">Any Gender</option><option value="Male">Male Only</option><option value="Female">Female Only</option>
                </select>
              </div>

              <div className="bg-[#F2EBE8] p-6 rounded-2xl border border-[#E0E0E0] space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <label className="font-bold text-[#332D2A] flex items-center gap-2 text-xs uppercase"><Sparkles size={16} className="text-[#FECE51]"/> AI Assistant</label>
                  <button type="button" onClick={generateAIDescription} className="bg-[#008080] text-[#FFFFFF] px-5 h-12 rounded-xl text-sm font-bold hover:opacity-90 flex items-center justify-center">{loadingAI ? "AI Writing..." : "Generate Description"}</button>
                </div>
                <input type="text" value={formData.features} placeholder="Enter features..." className="w-full p-3 rounded-xl border border-[#E0E0E0] outline-none focus:ring-2 focus:ring-[#008080] h-12" onChange={(e) => setFormData({...formData, features: e.target.value})} />
              </div>
              <textarea rows="4" value={formData.description} placeholder="Description..." className="w-full border border-[#E0E0E0] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#008080]" onChange={(e) => setFormData({...formData, description: e.target.value})} />
              
              <button type="submit" className="w-full bg-[#FECE51] text-[#332D2A] h-14 rounded-3xl font-bold text-lg hover:bg-[#F7C14B] shadow-md flex justify-center items-center gap-2">
                {editingId ? <><Edit2 size={20}/> Update Listing</> : 'Publish Listing'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-[#332D2A]"><LayoutDashboard className="text-[#008080]"/> Manage Listings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myListings.length === 0 ? <p className="text-[#7E736D]">No listings found.</p> : myListings.map(item => (
                <div key={item._id} className="bg-[#FFFFFF] p-6 rounded-3xl shadow-lg border border-[#E0E0E0] space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-[#332D2A]">{item.title}</h3>
                      <p className="text-xs text-[#7E736D] flex items-center gap-1"><MapPin size={12}/> {item.location}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border ${item.status === 'Available' ? 'bg-[#BED9D8] text-[#008080] border-[#008080]/30' : 'bg-[#C1121F]/10 text-[#C1121F] border-[#C1121F]/20'}`}>{item.status}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleStatus(item._id, item.status)} className="flex-1 h-12 bg-[#332D2A] text-[#FFFFFF] rounded-xl text-xs font-bold hover:bg-[#2F2A27]">Mark {item.status === 'Available' ? 'Full' : 'Available'}</button>
                    <button onClick={() => handleEditClick(item)} className="px-4 h-12 bg-[#F2EBE8] text-[#008080] rounded-xl text-xs font-bold hover:bg-[#BED9D8]">Edit</button>
                    <button onClick={() => deleteListing(item._id)} className="px-4 h-12 bg-[#F2EBE8] text-[#605853] rounded-xl text-xs font-bold hover:bg-[#C1121F] hover:text-[#FFFFFF]">Delete</button>
                  </div>
                  {item.status === 'Full' && (
                    <button onClick={() => viewWaitlist(item._id)} className="w-full h-12 bg-[#FECE51] text-[#332D2A] rounded-xl text-xs font-bold flex items-center justify-center gap-2"><Users size={14}/> View Waitlist</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- MODAL 1: OWNER WAITLIST VIEWER --- */}
        {showWaitlistModal && (
          <div className="fixed inset-0 bg-[#332D2A]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] rounded-[24px] shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200 relative border border-[#E0E0E0]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-[#332D2A]">
                  <Users className="text-[#008080]"/> Smart Waitlist
                </h3>
                <button onClick={() => setShowWaitlistModal(false)} className="text-[#7E736D] hover:text-[#C1121F] font-bold p-1">
                  <X size={20}/>
                </button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {waitlistData.length === 0 ? (
                  <p className="text-center text-[#7E736D] py-4 font-medium">No students on the waitlist yet.</p>
                ) : waitlistData.map((student, index) => (
                  <div key={student._id} className="bg-[#FCF5F3] border border-[#E0E0E0] p-4 rounded-2xl flex items-start gap-3 hover:shadow-sm transition">
                    <div className="bg-[#BED9D8] text-[#008080] w-6 h-6 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#332D2A]">{student.studentName}</p>
                      <p className="text-xs text-[#008080] font-medium">{student.studentEmail}</p>
                      <p className="text-[10px] text-[#7E736D] mt-1 uppercase font-semibold">Joined: {new Date(student.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL 2: CUSTOM AI WARNING POPUP --- */}
        {showAIWarning && (
          <div className="fixed inset-0 bg-[#332D2A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[#FFFFFF] rounded-[24px] shadow-2xl p-[32px] w-full max-w-lg flex flex-col items-center text-center">
              <div className="bg-[#F2EBE8] p-5 rounded-full mb-6 border-4 border-white shadow-inner"><AlertTriangle size={48} className="text-[#FECE51]" /></div>
              <h3 className="text-2xl font-black text-[#332D2A] mb-3">Verification Failed</h3>
              <p className="text-[#605853] mb-10">This doesn't look like a legitimate interior. Please upload a clear photo.</p>
              <button onClick={() => setShowAIWarning(false)} className="w-full bg-[#FECE51] text-[#332D2A] h-14 rounded-3xl font-bold text-lg active:scale-95 transition">Okay</button>
            </div>
          </div>
        )}

        {/* --- MODAL 3: ROOM TYPE SELECTION --- */}
        {showRoomSelection && (
          <div className="fixed inset-0 bg-[#332D2A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[#FFFFFF] rounded-[24px] shadow-2xl p-[32px] w-full max-w-md animate-in zoom-in-95 duration-200 border border-[#E0E0E0]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#332D2A]">Choose Room Type</h3>
                <button onClick={() => setShowRoomSelection(false)} className="text-[#7E736D] hover:text-[#C1121F]">
                  <X size={20}/>
                </button>
              </div>

              <div className="grid gap-4">
                <button 
                  onClick={() => {
                    setShowRoomSelection(false);
                    navigate(`/booking/${selectedBoardingId}?type=single`);
                  }}
                  className="w-full p-4 rounded-xl border-2 border-[#E0E0E0] hover:border-[#008080] hover:bg-[#BED9D8]/10 text-left transition group"
                >
                  <p className="font-bold text-[#332D2A] group-hover:text-[#008080]">Single Room</p>
                  <p className="text-xs text-[#7E736D]">Private space for one person</p>
                </button>

                <button 
                  onClick={() => {
                    setShowRoomSelection(false);
                    navigate(`/booking/${selectedBoardingId}?type=sharing`);
                  }}
                  className="w-full p-4 rounded-xl border-2 border-[#E0E0E0] hover:border-[#008080] hover:bg-[#BED9D8]/10 text-left transition group"
                >
                  <p className="font-bold text-[#332D2A] group-hover:text-[#008080]">Sharing Room</p>
                  <p className="text-xs text-[#7E736D]">Shared accommodation at a lower cost</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- NEW: MODAL 4: CUSTOM JOIN WAITLIST FORM --- */}
        {showJoinWaitlistModal && (
          <div className="fixed inset-0 bg-[#332D2A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[#FFFFFF] rounded-[24px] shadow-2xl p-[32px] w-full max-w-md animate-in zoom-in-95 duration-200 border border-[#E0E0E0]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-[#332D2A]">
                  <Users className="text-[#008080]"/> Join Waitlist
                </h3>
                <button onClick={() => setShowJoinWaitlistModal(false)} className="text-[#7E736D] hover:text-[#C1121F]">
                  <X size={20}/>
                </button>
              </div>

              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-[#332D2A] block mb-1">Your Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 rounded-xl border border-[#E0E0E0] outline-none focus:ring-2 focus:ring-[#008080] h-12"
                    value={waitlistForm.name}
                    onChange={(e) => setWaitlistForm({...waitlistForm, name: e.target.value})}
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-[#332D2A] block mb-1">SLIIT Email</label>
                  <input 
                    type="email" 
                    required
                    className="w-full p-3 rounded-xl border border-[#E0E0E0] outline-none focus:ring-2 focus:ring-[#008080] h-12"
                    value={waitlistForm.email}
                    onChange={(e) => setWaitlistForm({...waitlistForm, email: e.target.value})}
                    placeholder="it22xxxx@my.sliit.lk"
                  />
                </div>
                
                <p className="text-[11px] text-[#7E736D] leading-tight italic">
                  * We will automatically notify you via email as soon as this boarding becomes available.
                </p>

                <button 
                  type="submit"
                  className="w-full bg-[#332D2A] hover:bg-[#2F2A27] text-[#FFFFFF] h-[56px] rounded-[24px] font-bold text-lg transition shadow-md active:scale-95 mt-4"
                >
                  Get Notified
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;