import { LoginFormValues } from "@sincpro/mobile-odoo/domain/auth";
import { Form } from "@sincpro/mobile-ui";
import { Typography } from "@sincpro/mobile-ui/Typography";
import { Controller, useForm } from "react-hook-form";
import { TouchableOpacity, View } from "react-native";

interface LoginFormProps {
  onLogin: (data: LoginFormValues) => void;
  configureServer: () => void;
  onResetAccount: () => void;
  isLoading: boolean;
  error?: string;
  readonly?: boolean;
}

function LoginForm({
  onLogin,
  error,
  onResetAccount,
  configureServer,
  readonly,
  isLoading,
}: LoginFormProps) {
  const form = useForm<LoginFormValues>({
    mode: "all",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function renderError() {
    if (!error) {
      return null;
    }

    return (
      <Typography.Text className="text-danger mb-2" variant="bodySmall">
        {error}
      </Typography.Text>
    );
  }

  return (
    <View>
      <Controller
        control={form.control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Form.InputField
            error={form.formState.errors.email?.message}
            inputProps={{
              placeholder: "andru@coopebrisas.com",
              autoCapitalize: "none",
              autoComplete: "off",
              importantForAutofill: "no",
              onBlur,
              onChangeText: onChange,
              value,
            }}
            label="Usuario"
          />
        )}
        rules={{
          required: "El correo es requerido",
        }}
      />

      <Controller
        control={form.control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Form.PasswordInput
            error={form.formState.errors.password?.message}
            inputProps={{
              placeholder: "***********",
              onBlur,
              autoCapitalize: "none",
              onChangeText: onChange,
              value,
            }}
            label="Contraseña"
          />
        )}
        rules={{ required: "La contraseña es requerida" }}
      />

      {renderError()}

      <View className="mb-4 justify-end items-end">
        <TouchableOpacity onPress={onResetAccount}>
          <Typography.Text underline variant="bodySmall">
            {"¿Olvidaste tu contraseña?"}
          </Typography.Text>
        </TouchableOpacity>
      </View>
      <View className="mb-4 justify-end items-end">
        <TouchableOpacity onPress={configureServer}>
          <Typography.Text
            className="text-text-secondary"
            underline
            variant="bodySmall"
          >
            {"Agregar servidor"}
          </Typography.Text>
        </TouchableOpacity>
      </View>
      <Form.Button
        disabled={readonly}
        loading={isLoading}
        onPress={form.handleSubmit(onLogin)}
        title={"Ingresar"}
      />
    </View>
  );
}

export default LoginForm;
