import 'package:flutter/material.dart';

final marketPlaceTheme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: const Color(0xFF1D4ED8),
    primary: const Color(0xFF1D4ED8),
    secondary: const Color(0xFF0F766E),
    tertiary: const Color(0xFFB45309),
    surface: const Color(0xFFFBFCFE),
  ),
  brightness: Brightness.light,
  scaffoldBackgroundColor: const Color(0xFFF6F7FB),
  appBarTheme: const AppBarTheme(
    centerTitle: false,
    elevation: 0,
    backgroundColor: Color(0xFFF6F7FB),
    foregroundColor: Color(0xFF111827),
  ),
  inputDecorationTheme: InputDecorationTheme(
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      minimumSize: const Size(double.infinity, 48),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      minimumSize: const Size(0, 48),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
  ),
  chipTheme: const ChipThemeData(
    side: BorderSide(color: Color(0xFFE5E7EB)),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(8)),
    ),
  ),
  cardTheme: CardThemeData(
    elevation: 1,
    margin: EdgeInsets.zero,
    surfaceTintColor: Colors.white,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
  ),
);
