const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const getOtherParticipant = (conversation, userId) =>
    conversation.participants.find(
        (participant) => participant._id.toString() !== userId
    );

const startConversation = async (req, res, next) => {
    try {
        const currentUserId = req.userId;
        const { recipientId } = req.body;

        if (
            !mongoose.isValidObjectId(recipientId) ||
            recipientId === currentUserId.toString()
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid recipient is required.",
            });
        }

        let conversation = await Conversation.findOne({
            participants: { $all: [currentUserId, recipientId] },
        }).populate("participants", "username displayName profileImage");

        if (!conversation) {
            try {
                conversation = await Conversation.create({
                    participants: [currentUserId, recipientId],
                });
            } catch (error) {
                // Handle simultaneous attempts to start the same conversation later
                // with a dedicated uniqueness strategy if needed.
                throw error;
            }

            conversation = await Conversation.findById(conversation._id)
                .populate("participants", "username displayName profileImage");
        }

        return res.status(200).json({ success: true, conversation });
    } catch (error) {
        next(error);
    }
};


const getConversations = async (req, res, next) => {
    try {
        const conversations = await Conversation.find({
            participants: req.userId,
        })
            .populate("participants", "username displayName profileImage")
            .populate({
                path: "lastMessage",
                select: "text sender createdAt readAt",
            })
            .sort({ updatedAt: -1 });

        const conversationsWithUnreadCounts = await Promise.all(
            conversations.map(async (conversation) => {
                const unreadCount = await Message.countDocuments({
                    conversation: conversation._id,
                    sender: { $ne: req.userId },
                    readAt: null,
                });

                return {
                    ...conversation.toObject(),
                    unreadCount,
                };
            })
        );

        return res.status(200).json({
            success: true,
            conversations: conversationsWithUnreadCounts,
        });
    } catch (error) {
        next(error);
    }
};


const getMessages = async (req, res, next) => {
    try {
        const { conversationId } = req.params;

        if (!mongoose.isValidObjectId(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid conversation ID.",
            });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.userId,
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found.",
            });
        }

        const limit = Math.min(
            Math.max(Number.parseInt(req.query.limit, 10) || 50, 1),
            100
        );

        const messages = await Message.find({ conversation: conversationId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("sender", "username displayName profileImage")
            .lean();

        return res.status(200).json({
            success: true,
            messages: messages.reverse(),
        });
    } catch (error) {
        next(error);
    }
};

const sendMessage = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const text =
            typeof req.body.text === "string" ? req.body.text.trim() : "";

        if (!mongoose.isValidObjectId(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid conversation ID.",
            });
        }

        if (!text || text.length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Message must contain 1–5000 characters.",
            });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.userId,
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found.",
            });
        }

        const message = await Message.create({
            conversation: conversation._id,
            sender: req.userId,
            text,
        });

        conversation.lastMessage = message._id;
        conversation.updatedAt = new Date();
        await conversation.save();

        const populatedMessage = await Message.findById(message._id)
            .populate("sender", "username displayName profileImage");

        const io = req.app.get("io");

        if (io) {
            for (const participantId of conversation.participants) {
                io.to(`user:${participantId.toString()}`).emit("message:new", {
                    conversationId: conversation._id.toString(),
                    message: populatedMessage,
                });
            }
        }
        return res.status(201).json({
            success: true,
            message: populatedMessage,
        });
    } catch (error) {
        next(error);
    }
};


const getUnreadMessageCount = async (req, res, next) => {
  try {
    const unreadCount = await Message.countDocuments({
      sender: { $ne: req.userId },
      readAt: null,
      conversation: {
        $in: await Conversation.distinct(" _id", {
          participants: req.userId,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

const markConversationRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID.",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.userId },
        readAt: null,
      },
      { $set: { readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: "Conversation marked as read.",
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
    startConversation,
    getConversations,
    getMessages,
    sendMessage,
    getOtherParticipant,
    getUnreadMessageCount,
    markConversationRead,
};