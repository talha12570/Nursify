import { Stack } from "expo-router";
import "../global.css";
import { Header } from "@react-navigation/elements";

export default function RootLayout() {
  return <Stack screenOptions={{headerShown:false}}/>;
}
