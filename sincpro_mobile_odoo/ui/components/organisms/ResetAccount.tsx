import { OdooScreen } from "@sincpro/mobile-odoo/entrypoints/ui/AppScreen";
import { Form } from "@sincpro/mobile-ui";
import { Typography } from "@sincpro/mobile-ui/Typography";
import { View } from "react-native";
import { useNavigate } from "react-router-native";

function ResetAccount() {
  const navigate = useNavigate();
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
      <Form.InputField
        inputProps={{
          placeholder: "Ingresa tu correo",
          keyboardType: "email-address",
          autoCapitalize: "none",
        }}
        label="Email"
      />
      <Form.Button
        onPress={() => {
          navigate(OdooScreen.LOGIN);
        }}
        title="Restablecer"
      />
    </View>
  );
}

export default ResetAccount;
