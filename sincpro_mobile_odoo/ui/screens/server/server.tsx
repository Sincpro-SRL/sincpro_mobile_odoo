import { IServer } from "@sincpro/mobile-odoo/domain/server";
import { OdooScreen } from "@sincpro/mobile-odoo/entrypoints/ui/AppScreen";
import { useOdoo } from "@sincpro/mobile-odoo/entrypoints/ui/context";
import ServerConfigForm from "@sincpro/mobile-odoo/ui/components/organisms/ServerConfigForm";
import AuthFormView from "@sincpro/mobile-ui/views/AuthFormView";
import { useNavigate } from "react-router-native";

function ServerScreen() {
  const navigate = useNavigate();
  const { setServerParams, serverParams } = useOdoo();

  function onBackPress() {
    navigate(OdooScreen.LOGIN);
  }

  async function onSubmit(data: IServer) {
    try {
      await setServerParams(data);
      navigate(OdooScreen.LOGIN);
    } catch (error) {
      console.error("Error submitting server configuration:", error);
    }
  }

  return (
    <AuthFormView
      description={
        "Agrega la información necesaria para conectar con tu base de datos"
      }
      FormNode={
        <ServerConfigForm onSubmit={onSubmit} serverParams={serverParams} />
      }
      onBack={onBackPress}
      title={"Registra el servidor que deseas utilizar"}
    />
  );
}

export default ServerScreen;
