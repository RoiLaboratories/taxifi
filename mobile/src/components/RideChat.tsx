import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  message_type: 'text' | 'location';
  created_at: string;
  sender?: {
    full_name: string;
  };
}

interface ChatProps {
  rideId: string;
  receiverId: string;
  visible: boolean;
  onClose: () => void;
}

export function RideChat({ rideId, receiverId, visible, onClose }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    const subscription = subscribeToMessages();
    const typingSubscription = subscribeToTyping();

    return () => {
      subscription?.unsubscribe();
      typingSubscription?.unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:sender_id(full_name)
        `)
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    return supabase
      .channel(`chat-${rideId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `ride_id=eq.${rideId}`,
      }, async (payload) => {
        const { data: messageWithSender } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', payload.new.sender_id)
          .single();

        const newMessage = {
          ...payload.new,
          sender: messageWithSender,
        } as ChatMessage;

        setMessages(prev => [...prev, newMessage]);
        flatListRef.current?.scrollToEnd();
      })
      .subscribe();
  };

  const subscribeToTyping = () => {
    return supabase
      .channel(`typing-${rideId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_typing',
        filter: `ride_id=eq.${rideId}`,
      }, (payload) => {
        if (payload.new.user_id !== receiverId) return;
        setIsTyping(payload.new.is_typing);
      })
      .subscribe();
  };

  const updateTypingStatus = async (isTyping: boolean) => {
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return;

      await supabase
        .from('chat_typing')
        .upsert({
          user_id: profile.user.id,
          ride_id: rideId,
          is_typing: isTyping,
        });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  const handleMessageChange = (text: string) => {
    setNewMessage(text);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    updateTypingStatus(true);

    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return;

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          ride_id: rideId,
          sender_id: profile.user.id,
          receiver_id: receiverId,
          message: newMessage.trim(),
          message_type: 'text',
        });

      if (error) throw error;
      setNewMessage('');
      updateTypingStatus(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const shareLocation = async () => {
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return;

      const { data: locationData } = await supabase
        .from('rides')
        .select('driver_location')
        .eq('id', rideId)
        .single();

      if (!locationData?.driver_location) return;

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          ride_id: rideId,
          sender_id: profile.user.id,
          receiver_id: receiverId,
          message: 'Shared current location',
          message_type: 'location',
          location: locationData.driver_location,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sharing location:', error);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.sender_id === receiverId;

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {item.message_type === 'location' ? (
          <TouchableOpacity 
            style={styles.locationMessage}
            onPress={() => {
              // Handle opening location on map
            }}
          >
            <MaterialIcons name="location-on" size={20} color="#FFFFFF" />
            <Text style={styles.locationText}>View Location</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.messageText}>{item.message}</Text>
        )}
        <Text style={styles.messageTime}>
          {new Date(item.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <TouchableOpacity onPress={shareLocation}>
            <MaterialIcons name="location-on" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onLayout={() => flatListRef.current?.scrollToEnd()}
        />

        {isTyping && (
          <Text style={styles.typingIndicator}>typing...</Text>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          style={styles.inputContainer}
        >
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={handleMessageChange}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline
          />
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <MaterialIcons 
              name="send" 
              size={24} 
              color={newMessage.trim() ? '#10B981' : '#4B5563'} 
            />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#10B981',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#374151',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  messageTime: {
    color: '#D1D5DB',
    fontSize: 12,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  locationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
  },
  typingIndicator: {
    color: '#9CA3AF',
    fontSize: 14,
    marginLeft: 16,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  input: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
});
