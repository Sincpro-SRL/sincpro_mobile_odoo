import { useNavigation } from "@react-navigation/native";
import { IServer } from "@sincpro/mobile-odoo/domain/server";
import { useOdoo } from "@sincpro/mobile-odoo/entrypoints/ui/context";
import ServerConfigForm from "@sincpro/mobile-odoo/ui/components/organisms/ServerConfigForm";
import { useToast } from "@sincpro/mobile-ui/Feedback";
import type { AppBarBackground } from "@sincpro/mobile-ui/Navigation/Navigation.AppBar";
import AuthFormView from "@sincpro/mobile-ui/views/AuthFormView";
import type { ImageSourcePropType } from "react-native";

function ServerScreen({
  logoSource,
  background,
}: {
  logoSource?: ImageSourcePropType;
  background?: AppBarBackground;
}) {
  const navigation = useNavigation();
  const toast = useToast();
  const { setServerParams, serverParams } = useOdoo();

  function onBackPress() {
    navigation.goBack();
  }

  async function onSubmit(data: IServer) {
    try {
      await setServerParams(data);
      navigation.goBack();
    } catch {
      toast.danger("No se pudo guardar la configuración del servidor", {
        title: "Error",
      });
    }
  }

  return (
    <AuthFormView
      background={background}
      description={
        "Agrega la información necesaria para conectar con tu base de datos"
      }
      FormNode={
        <ServerConfigForm onSubmit={onSubmit} serverParams={serverParams} />
      }
      logoSource={logoSource}
      onBack={onBackPress}
      title={"Registra el servidor que deseas utilizar"}
    />
  );
}

export default ServerScreen;
