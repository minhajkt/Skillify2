import { Box, Typography, InputBase, Button, Avatar, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton, CircularProgress } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { socket } from "../../utils/socket";
import { RootState } from "../../store/store";
import { getMessages, postMessageImage } from "../../api/messageApi";
import { fetchStudentById, fetchTutorById } from "../../api/adminApi";
import DoneAllIcon from "@mui/icons-material/DoneAll";
// import InfoIcon from "@mui/icons-material/Info";
import DeleteIcon from "@mui/icons-material/Delete";
import NotInterestedIcon from "@mui/icons-material/NotInterested";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CancelIcon from "@mui/icons-material/Cancel";
import LazyLoad from 'react-lazyload';
import Notification from "./Notification";
import Navbar from "../shared/Navbar";

interface EmojiClickData {
  native: string;
}

const ChatComponent = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{
      senderId: string;
      recipientId: string;
      message: string;
      read: boolean;
      readAt?: string | null
      timestamp?:string
    }>
  >([]);
  const { tutorId, studentId } = useParams<{
    tutorId?: string;
    studentId?: string;
  }>();
  const [recipientName, setRecipientName] = useState("");
  const [recipientRole, setRecipientRole] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [openModal, setOpenModal] = useState(false)
  const [file, setFile] = useState<File | null> (null)
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState(null)
  const user = useSelector((state: RootState) => state.auth.user);
  const senderId = user?._id;
  const isTutor = user?.role === "tutor";
  const recipientId = isTutor ? studentId : tutorId;
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false);
  const [openNotification, setOpenNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const navigate = useNavigate()
  const [notificationSenderId, setNotificationSenderId] = useState<string | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  useEffect(() => {
    const fetchRecipientName = async () => {
      if (!recipientId) return;
      try {
        let data;
        if (isTutor) {
          data = await fetchStudentById(recipientId);
          // console.log('recipient is', data.role)
          setRecipientRole('user')
        } else {
          data = await fetchTutorById(recipientId);
          // console.log('recipient is', data.role)
          setRecipientRole('tutor')
        }
        setRecipientName(data?.name || "Unknown User");
      } catch (error) {
        console.error("Failed to fetch recipient details:", error);
      }
    };

    fetchRecipientName();
  }, [recipientId, isTutor]);

  useEffect(() => {
    if (!senderId || !recipientId) return;


    socket.emit("joinRoom", { senderId, recipientId });

    const fetchMessages = async () => {
      try {
        const response = await getMessages(senderId, recipientId);
        setMessages(response);
        if (response.some((msg) => msg.senderId === recipientId && !msg.read)) {
          socket.emit("message_read", { senderId, recipientId });
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    fetchMessages();

  socket.on("receive_message", (msg) => {
    if (
    msg.senderId !== senderId && 
    msg.recipientId === user._id && 
    msg.senderId !== recipientId
  ) {
    setNotificationSenderId(msg.senderId)
    setNotificationMessage(`New message from ${ recipientName || 'Someone'}`);
    setOpenNotification(true)
  }
    if (
      (msg.senderId === senderId && msg.recipientId === recipientId) ||
      (msg.senderId === recipientId && msg.recipientId === senderId)
    ) {
      setMessages((prevMessages) => [...prevMessages, msg]);
      if (msg.senderId === recipientId) {
        socket.emit("message_read", { senderId, recipientId });
      }
    }
  });

  socket.on(
    "message_read",
    ({ senderId: msgSenderId, recipientId: msgRecipientId, readAt }) => {
        console.log("Message read event received", { msgSenderId, msgRecipientId, readAt });
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (msg.senderId === senderId && msg.recipientId === recipientId && !msg.read) {
            return {
              ...msg,
              read: true,
              readAt: readAt,
            };
          }
          return msg;
        })
      );
    }
  );

  socket.on('message_deleted', ({messageId}) => {
    setMessages((prevMessages) => 
      prevMessages.map((msg) => 
      msg._id === messageId? {...msg, message: "This message was deleted"}: msg
    ))
  })


    return () => {
      socket.off("receive_message");
      socket.off("message_read");
      socket.off('message_deleted')
    };
  }, [senderId, recipientId]);

    const handleNotificationClose = () => {
      setOpenNotification(false);
    };

    const handleNotificationClick = () => {
      if(notificationSenderId) {
          if(recipientRole === 'tutor') {
            navigate(`/messages/${notificationSenderId}`);
          }else {
            navigate(`/tutors/contacts/${notificationSenderId}`)
          }
        setOpenNotification(false);
      }
    };

const sendMessage = async () => {
  if ((!message.trim() && !file) || !senderId || !recipientId) return;
  setLoading(true);

    try {

      const messageData = {
        senderId,
        recipientId,
        message: message.trim(),
        fileUrl: null,
        fileType: null,
        read: false,
        timestamp: new Date().toISOString(),
      };

      if(file) {
        const formData = new FormData()
        formData.append('file', file)
        
        
        const fileType = file.type.startsWith('image')? 'image' : 'video'
        
        const data = await postMessageImage(formData, fileType)
        
        messageData.fileUrl = data.imageUrl || data.videoUrl
        messageData.fileType = fileType
      }

      socket.emit("message", messageData);
      setMessage("");
      setFile(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setFilePreview(null);
    } catch (error) {
      console.error("Upload error:", error);
    }finally {
      setLoading(false);
    }
};

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setFile(file);
    console.log(file);
    if (file) {
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
  }
  };

  const handleDeleteClick = (messageId) => {
    setMessageToDelete(messageId)
    setOpenModal(true)
  }

  const handleConfirmDelete = () => {
    if(messageToDelete) {
      handleDeleteMessage(messageToDelete)
      setOpenModal(false)
      setMessageToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setOpenModal(false)
    setMessageToDelete(null)
  }
  const handleDeleteMessage = (messageId) => {
    socket.emit('delete_message', {messageId, senderId})
  }

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setMessage(message + emojiData.native);
    setShowEmojiPicker(false);
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker)
  }

  return (
    <>
    {/* <Navbar /> */}
      <Notification
        open={openNotification}
        message={notificationMessage}
        onClose={handleNotificationClose}
        onClick={handleNotificationClick}
      />
      <Box
        sx={{
          bgcolor: "#dbdbdb",
          height: "2.3%",
          width: "auto%",
          p: 3,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Avatar>{recipientName[0]}</Avatar>
        <Typography sx={{ ml: 2 }}>{recipientName}</Typography>
      </Box>
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          backgroundImage: "url('/images/bgbbg.jpg')",
        }}
      >
        <Box sx={{ p: 3 }}>
          {messages.map((msg, index) => {
            const isSender = msg.senderId === senderId;

            return (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  justifyContent: isSender ? "flex-end" : "flex-start",
                  mb: 1,
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    maxWidth: "60%",
                    p: 1,
                    borderRadius: 3,
                    wordBreak: "break-word",
                    bgcolor: isSender ? "#cdffcd" : "#ececec",
                    color: "text.primary",
                    textAlign: isSender ? "right" : "left",
                    "&:hover": {
                      ".delete-icon": { opacity: 1 },
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ wordBreak: "break-word" }}
                    >
                      {msg.message === "This message was deleted" ? (
                        <Typography
                          sx={{
                            color: "gray",
                            fontSize: 12,
                            fontStyle: "italic",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <NotInterestedIcon sx={{ fontSize: 12 }} /> This
                          message was deleted
                        </Typography>
                      ) : (
                        msg.message
                      )}
                    </Typography>
                    {isSender && msg.message !== "This message was deleted" && (
                      <DeleteIcon
                        onClick={() => handleDeleteClick(msg._id)}
                        className="delete-icon"
                        sx={{
                          fontSize: 16,
                          cursor: "pointer",
                          color: "gray",
                          opacity: 0,
                          transition: "opacity 0.3s",
                          position: "absolute",
                          top: 5,
                          right: 5,
                        }}
                      />
                    )}
                  </Box>

                  {msg.fileUrl &&
                    msg.message !== "This message was deleted" && (
                      <Box sx={{ mt: 2, maxWidth: "100%" }}>
                        <LazyLoad
                          once
                          offset={100}
                          throttle={100}
                          debounce={false}
                          overflow={true}
                          placeholder={
                            <Box
                              style={{
                                width: "300px",
                                maxWidth: "600px",
                                height: "auto",
                                background: "#f0f0f0",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <CircularProgress />
                            </Box>
                          }
                        >
                          {msg.fileType === "image" ? (
                            <Box
                              component="img"
                              src={msg.fileUrl}
                              alt="Attachment"
                              loading="lazy"
                              onError={(e) => {
                                console.error(
                                  "Image failed to load:",
                                  msg.fileUrl
                                );
                                e.currentTarget.style.display = "none";
                              }}
                              sx={{
                                width: "100%",
                                maxWidth: "300px",
                                height: "auto",
                                borderRadius: 2,
                                display: "block",
                              }}
                            />
                          ) : (
                            <Box
                              component="video"
                              controls
                              preload="none"
                              onError={(e) => {
                                console.error(
                                  "Video failed to load:",
                                  msg.fileUrl
                                );
                                e.currentTarget.style.display = "none";
                              }}
                              sx={{
                                width: "100%",
                                maxWidth: "300px",
                                height: "auto",
                                borderRadius: 2,
                                display: "block",
                              }}
                            >
                              <source src={msg.fileUrl} type="video/mp4" />
                              Your browser does not support the video tag.
                            </Box>
                          )}
                        </LazyLoad>
                      </Box>
                    )}

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isSender ? "flex-end" : "flex-start",
                      mt: 1,
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "0.7rem",
                        color: "text.secondary",
                        lineHeight: 1,
                      }}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>

                    {isSender && msg.message !== "This message was deleted" && (
                      <Tooltip
                        title={`Read at ${
                          msg.readAt
                            ? new Date(msg.readAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Not read yet"
                        }`}
                        placement="top"
                        arrow
                      >
                        <DoneAllIcon
                          sx={{
                            fontSize: 14,
                            color: msg.read ? "#2196f3" : "rgba(0, 0, 0, 0.3)",
                            ml: 1,
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
        <div ref={messagesEndRef} />
      </Box>

      <Box
        sx={{
          p: 2,
          pt: 0,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          position: "sticky",
          bottom: 0,
        }}
      >
        {filePreview && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 1 }}>
            {file?.type.startsWith("image") ? (
              <img
                src={filePreview}
                alt="Preview"
                style={{ width: 200, height: 200, borderRadius: 0 }}
              />
            ) : (
              <video
                src={filePreview}
                controls
                style={{ width: 200, height: 200, borderRadius: 0 }}
              />
            )}
            <IconButton
              onClick={() => {
                setFile(null);
                setFilePreview(null);
              }}
            >
              <CancelIcon />
            </IconButton>
          </Box>
        )}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            bgcolor: "#f5f5f5",
            borderRadius: 2,
            p: "4px",
            pr: 1,
          }}
        >
          <Button onClick={toggleEmojiPicker}  >
            <img src="/images/em.png" style={{ width: "25px"}} />
          </Button>
          {showEmojiPicker && (
            <Box
              sx={{
                position: "absolute",
                bottom: "100%",
                left: "2%",
                zIndex: 1000,
                marginBottom: "10px",
              }}
            >
              <Picker data={data} onEmojiSelect={handleEmojiSelect} />
            </Box>
          )}
          <InputBase
            sx={{
              flex: 1,
              px: 0,
              py: 1,
              "& input": {
                fontSize: "1rem",
              },
            }}
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,video/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <IconButton onClick={() => fileInputRef.current?.click()}>
            <AttachFileIcon />
          </IconButton>
          <Button
            variant="contained"
            onClick={sendMessage}
            endIcon={
              loading ? (
                <CircularProgress
                  size={20}
                  sx={{ color: "blue", margin: "auto" }}
                />
              ) : (
                <SendIcon />
              )
            }
            disabled={loading || (!message && !file)}
            sx={{
              borderRadius: 6,
              textTransform: "none",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              px: 3,
              "&:hover": {
                transform: "translateY(-1px)",
                transition: "transform 0.2s",
              },
            }}
          >
            {loading ? "" : "Send"}
          </Button>
        </Box>
      </Box>
      <Dialog
        open={openModal}
        onClose={handleCancelDelete}
        aria-labelledby="delete-message-dialog-title"
        aria-describedby="delete-message-dialog-description"
      >
        <DialogTitle id="delete-message-dialog-title">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-message-dialog-description">
            Are you sure you want to delete this message? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatComponent;

