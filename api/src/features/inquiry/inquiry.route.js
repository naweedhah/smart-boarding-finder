const router = require("express").Router();
const { createInquiry } = require("./inquiry.controller");

router.post("/", createInquiry);

module.exports = router;