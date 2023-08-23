import React, { FC } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "./apollo";
import { palette } from "./palette";
import {
  useFonts,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import Loader from "./components/Loader";
import moment from "moment";
import HomeScreen from "./screens/HomeScreen";

moment.updateLocale("en", {
  relativeTime: {
    future: "%s",
    past: "%s",
    s: "now",
    ss: "%ds",
    m: "1m",
    mm: "%dm",
    h: "1h",
    hh: "%dh",
    d: "1d",
    dd: "%dd",
    M: "1mo",
    MM: "%dmo",
    y: "1y",
    yy: "%dy"
  },
});

const Stack = createNativeStackNavigator();

const App: FC = () => {
  const [fontsLoaded] = useFonts({
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <Loader />
    );
  }

  return (
    <ApolloProvider client={apolloClient}>
      <StatusBar
        style="light"
        backgroundColor={palette.primary}
      />
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="EA Forum" component={HomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ApolloProvider>
  );
}

export default App;
