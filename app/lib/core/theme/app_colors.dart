import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary Brand Colors (Bold Red from logo)
  static const Color primary = Color(0xFFE82525);
  static const Color primaryLight = Color(0xFFF07070);
  static const Color primaryDark = Color(0xFFB01A1A);

  // Secondary Colors (Charcoal from logo text)
  static const Color secondary = Color(0xFF2D2D2D);
  static const Color secondaryLight = Color(0xFF5A5A5A);
  static const Color secondaryDark = Color(0xFF1A1A1A);

  // Accent Colors (Soft Rose from logo)
  static const Color accent = Color(0xFFF07070);
  static const Color accentLight = Color(0xFFF5A0A0);
  static const Color accentDark = Color(0xFFD04040);

  // Safety Colors
  static const Color emergency = Color(0xFFD50000);     // Emergency red
  static const Color warning = Color(0xFFFFAB00);       // Warning amber
  static const Color safe = Color(0xFF00C853);          // Safe green

  // Background Colors
  static const Color backgroundLight = Color(0xFFF5F5F5);
  static const Color backgroundDark = Color(0xFF121212);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceDark = Color(0xFF1E1E1E);

  // Text Colors
  static const Color textPrimaryLight = Color(0xFF212121);
  static const Color textSecondaryLight = Color(0xFF757575);
  static const Color textPrimaryDark = Color(0xFFFFFFFF);
  static const Color textSecondaryDark = Color(0xFFB3B3B3);

  // Map Colors
  static const Color routeActive = Color(0xFFE82525);
  static const Color routeCompleted = Color(0xFF2D2D2D);
  static const Color routePending = Color(0xFFBDBDBD);
  static const Color breadcrumb = Color(0xFFF07070);

  // Traffic Density Colors
  static const Color trafficLow = Color(0xFF00C853);
  static const Color trafficMedium = Color(0xFFFFEB3B);
  static const Color trafficHigh = Color(0xFFE82525);

  // Difficulty Colors
  static const Color difficultyEasy = Color(0xFF4CAF50);
  static const Color difficultyModerate = Color(0xFFFFC107);
  static const Color difficultyHard = Color(0xFFF07070);
  static const Color difficultyExpert = Color(0xFFE82525);
}
