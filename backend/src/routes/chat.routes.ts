import { Router } from 'express';
import { supabase } from '../index';
import type { ChatMessage, MessageType } from '../models/types';
import { MessageEncryption } from '../utils/encryption';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: './uploads/chat',
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF allowed.'));
    }
  }
});

const router = Router();

// Initialize chat room for a ride
router.post('/rooms', async (req, res) => {
  try {
    const { ride_id, driver_id, rider_id } = req.body;

    const { data: room, error } = await supabase
      .from('chat_rooms')
      .insert([
        {
          ride_id,
          driver_id,
          rider_id,
          status: 'active'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(room);

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error creating chat room'
    });
  }
});

// Get chat room by ride ID
router.get('/rooms/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params;

    const { data: room, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('ride_id', rideId)
      .single();

    if (error) throw error;

    res.json(room);

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error fetching chat room'
    });
  }
});

// Send a message
router.post('/messages', async (req, res) => {
  try {
    const { 
      ride_id, 
      sender_id, 
      receiver_id, 
      message, 
      message_type = 'text',
      media_url,
      location 
    } = req.body;

    let finalMessage = message;
    let encryption_iv = null;
    let is_encrypted = false;

    // Encrypt text messages
    if (message_type === 'text') {
      const { encryptedData, iv } = MessageEncryption.encrypt(message);
      finalMessage = encryptedData;
      encryption_iv = iv;
      is_encrypted = true;
    }

    // Create message
    const { data: newMessage, error: messageError } = await supabase
      .from('chat_messages')
      .insert([
        {
          ride_id,
          sender_id,
          receiver_id,
          message: finalMessage,
          message_type,
          is_read: false,
          is_encrypted,
          encryption_iv,
          media_url,
          location
        }
      ])
      .select()
      .single();

    if (messageError) throw messageError;

    // Update chat room's last message
    const lastMessagePreview = message_type === 'text' 
      ? message.substring(0, 50) 
      : `Sent ${message_type}`;

    const { error: roomError } = await supabase
      .from('chat_rooms')
      .update({
        last_message: lastMessagePreview,
        last_message_time: new Date().toISOString()
      })
      .eq('ride_id', ride_id);

    if (roomError) throw roomError;

    // Note: Real-time updates are handled by client-side subscriptions
    res.status(201).json(newMessage);

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error sending message'
    });
  }
});

// Get messages for a ride
router.get('/messages/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params;

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(messages);

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error fetching messages'
    });
  }
});

// Mark messages as read
router.put('/messages/read', async (req, res) => {
  try {
    const { ride_id, user_id } = req.body;

    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('ride_id', ride_id)
      .eq('receiver_id', user_id)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ message: 'Messages marked as read' });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error marking messages as read'
    });
  }
});

// Get unread message count for a user
router.get('/messages/unread/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ count: data.length });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error fetching unread count'
    });
  }
});

// Upload chat image
router.post('/messages/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    // Return the file path that can be used in the message
    const mediaUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ mediaUrl });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error uploading file'
    });
  }
});

// Update typing status
router.post('/typing', async (req, res) => {
  try {
    const { ride_id, user_id, is_typing } = req.body;

    const { error } = await supabase
      .from('chat_typing')
      .upsert([
        {
          ride_id,
          user_id,
          is_typing,
          updated_at: new Date().toISOString()
        }
      ], {
        onConflict: 'ride_id,user_id'
      });

    if (error) throw error;

    res.json({ message: 'Typing status updated' });

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error updating typing status'
    });
  }
});

// Get typing status for a ride
router.get('/typing/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params;

    const { data, error } = await supabase
      .from('chat_typing')
      .select('*')
      .eq('ride_id', rideId)
      .eq('is_typing', true)
      // Only show users who updated their status in the last 10 seconds
      .gte('updated_at', new Date(Date.now() - 10000).toISOString());

    if (error) throw error;

    res.json(data);

  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Error fetching typing status'
    });
  }
});

export default router;
