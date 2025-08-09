import { type ReactElement } from 'react';
import { type RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { type AuthStackParamList, type NavigationProps } from '../../types/navigation';
import { EmailVerification } from '../../components/EmailVerification';

type EmailVerificationScreenProps = {
  route: RouteProp<AuthStackParamList, 'EmailVerification'>;
};

export function EmailVerificationScreen({ route }: EmailVerificationScreenProps): ReactElement {
  const navigation = useNavigation<NavigationProps>();
  const { email } = route.params;

  const handleVerified = () => {
    // Navigate to loading screen which will handle the auth state
    navigation.replace('Loading');
  };

  return (
    <EmailVerification
      email={email}
      onVerified={handleVerified}
    />
  );
}
