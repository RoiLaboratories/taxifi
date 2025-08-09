import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { UserRole } from '../types/supabase';

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void;
}

export function RoleSelection({ onRoleSelect }: RoleSelectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.roleButton}
          onPress={() => onRoleSelect('driver')}
        >
          <Text style={styles.roleText}>I want to drive</Text>
          <Text style={styles.description}>Earn money by driving</Text>
          <Text style={styles.highlight}>
            • Drive when you want{'\n'}
            • Set your own schedule{'\n'}
            • Save for big goals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.roleButton}
          onPress={() => onRoleSelect('rider')}
        >
          <Text style={styles.roleText}>I need a ride</Text>
          <Text style={styles.description}>Get a reliable ride</Text>
          <Text style={styles.highlight}>
            • Rides in minutes{'\n'}
            • Comfortable vehicles{'\n'}
            • Safe & secure trips
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  buttonContainer: {
    gap: 24,
  },
  roleButton: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  roleText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 12,
  },
  highlight: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 24,
  }
});
