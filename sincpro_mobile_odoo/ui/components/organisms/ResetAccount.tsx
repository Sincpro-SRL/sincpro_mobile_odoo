import { useNavigation } from "@react-navigation/native";
import { Actions } from "@sincpro/mobile-ui/Actions";
import { Form } from "@sincpro/mobile-ui/Form";
import { Typography } from "@sincpro/mobile-ui/Typography";
import { View } from "react-native";

function ResetAccount() {
  const navigation = useNavigation();
  return (
    <View>
      <View className="mb-5">
        <Typography.Text semibold variant="h4">
          Restablecer cuenta
        </Typography.Text>
        <Typography.Text variant="body">
          Ingresa tu correo para restablecer tu cuenta
        </Typography.Text>
      </View>
      <Form.Input
        autoCapitalize="none"
        keyboardType="email-address"
        label="Email"
        look="outline"
        placeholder="Ingresa tu correo"
      />
      <Actions.Button
        onPress={() => {
          navigation.goBack();
        }}
        title="Restablecer"
        variant="cta"
      />
    </View>
  );
}

export default ResetAccount;
