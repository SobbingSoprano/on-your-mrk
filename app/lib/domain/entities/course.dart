import 'package:equatable/equatable.dart';
import 'geo_point.dart';

/// Represents a course/route that users can complete
class Course extends Equatable {
  final String id;
  final String creatorId;
  final String name;
  final String? description;
  final String? imageUrl;
  final List<GeoPoint> waypoints;
  final List<GeoPoint> routePath;
  final double distanceMeters;
  final double elevationGainMeters;
  final int estimatedMinutes;
  final CourseDifficulty difficulty;
  final TrafficRating trafficRating;
  final CourseStats stats;
  final List<String> tags;
  final bool isPublic;
  final bool isCollaborative;
  final String? shapeDescription; // "Star", "Heart", "Custom", etc.
  final DateTime createdAt;
  final DateTime updatedAt;

  const Course({
    required this.id,
    required this.creatorId,
    required this.name,
    this.description,
    this.imageUrl,
    required this.waypoints,
    required this.routePath,
    required this.distanceMeters,
    required this.elevationGainMeters,
    required this.estimatedMinutes,
    required this.difficulty,
    required this.trafficRating,
    required this.stats,
    this.tags = const [],
    this.isPublic = true,
    this.isCollaborative = false,
    this.shapeDescription,
    required this.createdAt,
    required this.updatedAt,
  });

  double get distanceKm => distanceMeters / 1000;
  double get distanceMiles => distanceMeters / 1609.344;

  @override
  List<Object?> get props => [
        id,
        creatorId,
        name,
        description,
        imageUrl,
        waypoints,
        routePath,
        distanceMeters,
        elevationGainMeters,
        estimatedMinutes,
        difficulty,
        trafficRating,
        stats,
        tags,
        isPublic,
        isCollaborative,
        shapeDescription,
        createdAt,
        updatedAt,
      ];
}

/// Difficulty rating for a course
enum CourseDifficulty {
  easy(1, 'Easy', 'Flat terrain, short distance'),
  moderate(2, 'Moderate', 'Some hills, medium distance'),
  hard(3, 'Hard', 'Significant hills, longer distance'),
  expert(4, 'Expert', 'Challenging terrain, long distance');

  final int level;
  final String label;
  final String description;

  const CourseDifficulty(this.level, this.label, this.description);
}

/// Traffic rating indicating foot/vehicle traffic density
class TrafficRating extends Equatable {
  final TrafficLevel pedestrianTraffic;
  final TrafficLevel vehicleTraffic;
  final String? notes;
  final DateTime lastUpdated;

  const TrafficRating({
    required this.pedestrianTraffic,
    required this.vehicleTraffic,
    this.notes,
    required this.lastUpdated,
  });

  @override
  List<Object?> get props => [
        pedestrianTraffic,
        vehicleTraffic,
        notes,
        lastUpdated,
      ];
}

enum TrafficLevel {
  low(1, 'Low', 'Rarely encounter others'),
  moderate(2, 'Moderate', 'Some traffic expected'),
  high(3, 'High', 'Busy area, frequent encounters'),
  veryHigh(4, 'Very High', 'Crowded, may affect pace');

  final int level;
  final String label;
  final String description;

  const TrafficLevel(this.level, this.label, this.description);
}

/// Aggregate statistics for a course
class CourseStats extends Equatable {
  final int completionCount;
  final double averageRating;
  final int reviewCount;
  final int averageCompletionMinutes;
  final int favoriteCount;

  const CourseStats({
    this.completionCount = 0,
    this.averageRating = 0.0,
    this.reviewCount = 0,
    this.averageCompletionMinutes = 0,
    this.favoriteCount = 0,
  });

  @override
  List<Object?> get props => [
        completionCount,
        averageRating,
        reviewCount,
        averageCompletionMinutes,
        favoriteCount,
      ];
}
