import { LoginFormValues } from "@sincpro/mobile-odoo/domain/auth";
import { Actions } from "@sincpro/mobile-ui/Actions";
import { Feedback } from "@sincpro/mobile-ui/Feedback";
import { Form } from "@sincpro/mobile-ui/Form";
import { Typography } from "@sincpro/mobile-ui/Typography";
import { Controller, useForm } from "react-hook-form";
import { TouchableOpacity, View } from "react-native";

interface LoginFormProps {
  onLogin: (data: LoginFormValues) => void;
  configureServer: () => void;
  onResetAccount: () => void;
  isLoading: boolean;
  error?: string;
  disabled?: boolean;
  readonly?: boolean;
}

function LoginForm({
  onLogin,
  error,
  onResetAccount,
  configureServer,
  disabled = false,
  readonly = false,
  isLoading,
}: LoginFormProps) {
  const fieldsDisabled = disabled || readonly;
  const disabledProps = { disabled: fieldsDisabled };
  const inputState = {
    editable: !fieldsDisabled,
    accessibilityState: { disabled: fieldsDisabled },
  };
  const form = useForm<LoginFormValues>({
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function renderError() {
    if (!error || fieldsDisabled) {
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
      {fieldsDisabled && (
        <Feedback.Banner
          className="mb-4"
          message="Configura el servidor para habilitar el acceso a tu cuenta."
          title="Servidor no configurado"
          tone="info"
        />
      )}
      <View
        className={fieldsDisabled ? "opacity-50" : undefined}
        pointerEvents={fieldsDisabled ? "none" : "auto"}
      >
        <Controller
          control={form.control}
          disabled={fieldsDisabled}
          name="email"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <Form.InputField
              {...disabledProps}
              error={fieldsDisabled ? undefined : fieldState.error?.message}
              inputProps={{
                ...inputState,
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
          disabled={fieldsDisabled}
          name="password"
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <Form.PasswordInput
              {...disabledProps}
              error={fieldsDisabled ? undefined : fieldState.error?.message}
              inputProps={{
                ...inputState,
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
      </View>

      {renderError()}

      {!fieldsDisabled && (
        <>
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
        </>
      )}
      <Actions.Button
        loading={!fieldsDisabled && isLoading}
        onPress={fieldsDisabled ? configureServer : form.handleSubmit(onLogin)}
        title={fieldsDisabled ? "Configurar servidor" : "Ingresar"}
        variant="cta"
      />
    </View>
  );
}

export default LoginForm;
