import 'package:equatable/equatable.dart';

/// Represents a user in the on your Mark! system
class User extends Equatable {
  final String id;
  final String email;
  final String displayName;
  final String? profileImageUrl;
  final UserProfile profile;
  final SafetySettings safetySettings;
  final List<String> trustedContactIds;
  final DateTime createdAt;
  final DateTime updatedAt;

  const User({
    required this.id,
    required this.email,
    required this.displayName,
    this.profileImageUrl,
    required this.profile,
    required this.safetySettings,
    required this.trustedContactIds,
    required this.createdAt,
    required this.updatedAt,
  });

  @override
  List<Object?> get props => [
        id,
        email,
        displayName,
        profileImageUrl,
        profile,
        safetySettings,
        trustedContactIds,
        createdAt,
        updatedAt,
      ];
}

/// User profile with health and fitness data
class UserProfile extends Equatable {
  final String? firstName;
  final String? lastName;
  final DateTime? dateOfBirth;
  final double? weightKg;
  final double? heightCm;
  final Gender? gender;
  final FitnessLevel fitnessLevel;
  final List<String> preferredActivities;
  final bool healthKitEnabled;
  final bool googleFitEnabled;

  const UserProfile({
    this.firstName,
    this.lastName,
    this.dateOfBirth,
    this.weightKg,
    this.heightCm,
    this.gender,
    this.fitnessLevel = FitnessLevel.beginner,
    this.preferredActivities = const [],
    this.healthKitEnabled = false,
    this.googleFitEnabled = false,
  });

  @override
  List<Object?> get props => [
        firstName,
        lastName,
        dateOfBirth,
        weightKg,
        heightCm,
        gender,
        fitnessLevel,
        preferredActivities,
        healthKitEnabled,
        googleFitEnabled,
      ];
}

/// Safety settings for user protection features
class SafetySettings extends Equatable {
  final bool locationPingingEnabled;
  final int locationPingIntervalSeconds;
  final bool awolEnabled;
  final int awolTimeoutMinutes;
  final bool breadcrumbsEnabled;
  final int breadcrumbIntervalMeters;
  final bool autoOfflineBreadcrumbs;
  final bool emergencyButtonEnabled;
  final String? emergencyMessage;

  const SafetySettings({
    this.locationPingingEnabled = false,
    this.locationPingIntervalSeconds = 60,
    this.awolEnabled = false,
    this.awolTimeoutMinutes = 30,
    this.breadcrumbsEnabled = true,
    this.breadcrumbIntervalMeters = 50,
    this.autoOfflineBreadcrumbs = true,
    this.emergencyButtonEnabled = true,
    this.emergencyMessage,
  });

  @override
  List<Object?> get props => [
        locationPingingEnabled,
        locationPingIntervalSeconds,
        awolEnabled,
        awolTimeoutMinutes,
        breadcrumbsEnabled,
        breadcrumbIntervalMeters,
        autoOfflineBreadcrumbs,
        emergencyButtonEnabled,
        emergencyMessage,
      ];
}

enum Gender { male, female, nonBinary, preferNotToSay }

enum FitnessLevel { beginner, intermediate, advanced, athlete }
