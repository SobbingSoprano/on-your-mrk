import 'package:equatable/equatable.dart';
import 'geo_point.dart';
import 'course.dart';

/// Represents an active route session (user currently running/walking)
class ActiveRoute extends Equatable {
  final String id;
  final String oderId;
  final String? courseId;
  final Course? course;
  final ActiveRouteStatus status;
  final GeoPoint startPoint;
  final GeoPoint? endPoint;
  final GeoPoint currentLocation;
  final List<GeoPoint> recordedPath;
  final List<Breadcrumb> breadcrumbs;
  final double distanceCoveredMeters;
  final double elevationGainMeters;
  final int elapsedSeconds;
  final int? estimatedSecondsRemaining;
  final NavigationState? navigationState;
  final SafetyState safetyState;
  final DateTime startedAt;
  final DateTime? completedAt;
  final DateTime lastUpdated;

  const ActiveRoute({
    required this.id,
    required this.oderId,
    this.courseId,
    this.course,
    required this.status,
    required this.startPoint,
    this.endPoint,
    required this.currentLocation,
    required this.recordedPath,
    required this.breadcrumbs,
    required this.distanceCoveredMeters,
    required this.elevationGainMeters,
    required this.elapsedSeconds,
    this.estimatedSecondsRemaining,
    this.navigationState,
    required this.safetyState,
    required this.startedAt,
    this.completedAt,
    required this.lastUpdated,
  });

  double get paceMinutesPerKm =>
      distanceCoveredMeters > 0 ? (elapsedSeconds / 60) / (distanceCoveredMeters / 1000) : 0;

  double get speedKmh =>
      elapsedSeconds > 0 ? (distanceCoveredMeters / 1000) / (elapsedSeconds / 3600) : 0;

  double get progressPercent => course != null && course!.distanceMeters > 0
      ? (distanceCoveredMeters / course!.distanceMeters * 100).clamp(0, 100)
      : 0;

  @override
  List<Object?> get props => [
        id,
        oderId,
        courseId,
        course,
        status,
        startPoint,
        endPoint,
        currentLocation,
        recordedPath,
        breadcrumbs,
        distanceCoveredMeters,
        elevationGainMeters,
        elapsedSeconds,
        estimatedSecondsRemaining,
        navigationState,
        safetyState,
        startedAt,
        completedAt,
        lastUpdated,
      ];
}

enum ActiveRouteStatus {
  preparing,
  active,
  paused,
  completed,
  cancelled,
  emergency,
}

/// Turn-by-turn navigation state
class NavigationState extends Equatable {
  final GeoPoint nextWaypoint;
  final int waypointIndex;
  final int totalWaypoints;
  final double distanceToNextMeters;
  final NavigationInstruction currentInstruction;
  final NavigationInstruction? upcomingInstruction;

  const NavigationState({
    required this.nextWaypoint,
    required this.waypointIndex,
    required this.totalWaypoints,
    required this.distanceToNextMeters,
    required this.currentInstruction,
    this.upcomingInstruction,
  });

  @override
  List<Object?> get props => [
        nextWaypoint,
        waypointIndex,
        totalWaypoints,
        distanceToNextMeters,
        currentInstruction,
        upcomingInstruction,
      ];
}

/// A single navigation instruction
class NavigationInstruction extends Equatable {
  final NavigationManeuver maneuver;
  final String streetName;
  final double distanceMeters;
  final String spokenInstruction;

  const NavigationInstruction({
    required this.maneuver,
    required this.streetName,
    required this.distanceMeters,
    required this.spokenInstruction,
  });

  @override
  List<Object?> get props => [maneuver, streetName, distanceMeters, spokenInstruction];
}

enum NavigationManeuver {
  straight,
  turnLeft,
  turnRight,
  slightLeft,
  slightRight,
  sharpLeft,
  sharpRight,
  uTurn,
  arrive,
  depart,
}

/// Safety monitoring state during active route
class SafetyState extends Equatable {
  final bool isLocationPinging;
  final DateTime? lastPingSent;
  final bool isAwolActive;
  final DateTime? awolDeadline;
  final bool isOffline;
  final DateTime? wentOfflineAt;
  final int breadcrumbCount;
  final GeoPoint? lastKnownLocation;
  final DateTime? lastServerContact;

  const SafetyState({
    this.isLocationPinging = false,
    this.lastPingSent,
    this.isAwolActive = false,
    this.awolDeadline,
    this.isOffline = false,
    this.wentOfflineAt,
    this.breadcrumbCount = 0,
    this.lastKnownLocation,
    this.lastServerContact,
  });

  bool get isAwolTriggered =>
      isAwolActive && awolDeadline != null && DateTime.now().isAfter(awolDeadline!);

  @override
  List<Object?> get props => [
        isLocationPinging,
        lastPingSent,
        isAwolActive,
        awolDeadline,
        isOffline,
        wentOfflineAt,
        breadcrumbCount,
        lastKnownLocation,
        lastServerContact,
      ];
}
