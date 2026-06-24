import { IServer } from "@sincpro/mobile-odoo/domain/server";
import { Form } from "@sincpro/mobile-ui/Form";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

const Button = Form.Button;
const InputField = Form.InputField;

interface ServerConfigFormProps {
  onSubmit: (data: IServer) => void;
  serverParams: IServer | null;
}

function ServerConfigForm({ onSubmit, serverParams }: ServerConfigFormProps) {
  const form = useForm<IServer>({
    mode: "all",
    defaultValues: {
      server: serverParams?.server || "",
      database: serverParams?.database || "",
    },
  });

  return (
    <View>
      <Controller
        control={form.control}
        name="server"
        render={({ field: { onChange, onBlur, value } }) => (
          <InputField
            error={form.formState.errors?.server?.message}
            inputProps={{
              placeholder: "Agrega el servidor",
              autoCapitalize: "none",
              onBlur,
              onChangeText: onChange,
              value,
            }}
            label={"Servidor"}
          />
        )}
        rules={{
          required: "El servidor es requerido",
        }}
      />
      <Controller
        control={form.control}
        name="database"
        render={({ field: { onChange, onBlur, value } }) => (
          <InputField
            error={form.formState.errors.database?.message}
            inputProps={{
              placeholder: "Agrega la base de datos",
              onBlur,
              onChangeText: onChange,
              value,
            }}
            label={"Base de datos"}
          />
        )}
        rules={{ required: "La base de datos es requerida" }}
      />
      <Button
        onPress={form.handleSubmit(onSubmit)}
        title={"Guardar configuración"}
        variant="cta"
      />
    </View>
  );
}

export default ServerConfigForm;
