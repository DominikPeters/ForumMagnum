export const palette = {
  borderRadius: 6,
  primary: "#0c869b",
  grey: {
    // Exactly matches @material-ui/core/colors/grey
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#eeeeee",
    300: "#e0e0e0",
    400: "#bdbdbd",
    500: "#9e9e9e",
    600: "#757575",
    700: "#616161",
    800: "#424242",
    900: "#212121",
    A100: "#d5d5d5",
    A200: "#aaaaaa",
    A400: "#303030",
    A700: "#616161",

    // Greyscale colors not in the MUI palette
    0: "#fff",
    1000: "#000",

    10: "#fefefe",
    20: "#fdfdfd",
    25: "#fcfcfc",
    30: "#fbfbfb",
    55: "#f9f9f9",
    60: "#f8f8f8",
    110: "#f3f3f3",
    120: "#f2f2f2",
    140: "#f0f0f0",
    250: "#e8e8e8",
    310: "#dddddd",
    315: "#d4d4d4",
    320: "#d9d9d9",
    340: "#d0d0d0",
    405: "#bbbbbb",
    410: "#b3b3b3",
    550: "#999999",
    620: "#888888",
    650: "#808080",
    680: "#666666",
    710: "#606060",
    750: "#5e5e5e",
  },
  fonts: {
    sans: {
      medium: "Inter_500Medium",
      semiBold: "Inter_600SemiBold",
      bold: "Inter_700Bold",
    },
  },
} as const;
