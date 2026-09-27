import { ActivityIndicator } from 'react-native';
import { Screen } from '@/components/screen';

export default function AuthCallback() {
  return <Screen><ActivityIndicator accessibilityLabel="Opening account link" /></Screen>;
}
