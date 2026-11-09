import { IServer } from "@sincpro/mobile-odoo/domain/server";
import { Actions } from "@sincpro/mobile-ui/Actions";
import { Form } from "@sincpro/mobile-ui/Form";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

const Button = Actions.Button;
const Input = Form.Input;

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
          <Input
            autoCapitalize="none"
            error={form.formState.errors?.server?.message}
            label={"Servidor"}
            look="outline"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Agrega el servidor"
            value={value}
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
          <Input
            error={form.formState.errors.database?.message}
            label={"Base de datos"}
            look="outline"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Agrega la base de datos"
            value={value}
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
