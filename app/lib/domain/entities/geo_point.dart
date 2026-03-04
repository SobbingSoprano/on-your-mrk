import 'package:equatable/equatable.dart';

/// Represents a geographic coordinate point
class GeoPoint extends Equatable {
  final double latitude;
  final double longitude;
  final double? altitude;
  final double? accuracy;
  final DateTime? timestamp;

  const GeoPoint({
    required this.latitude,
    required this.longitude,
    this.altitude,
    this.accuracy,
    this.timestamp,
  });

  /// Calculate distance to another point in meters using Haversine formula
  double distanceTo(GeoPoint other) {
    const double earthRadius = 6371000; // meters
    
    final double lat1Rad = latitude * (3.141592653589793 / 180);
    final double lat2Rad = other.latitude * (3.141592653589793 / 180);
    final double deltaLat = (other.latitude - latitude) * (3.141592653589793 / 180);
    final double deltaLon = (other.longitude - longitude) * (3.141592653589793 / 180);

    final double a = _sin(deltaLat / 2) * _sin(deltaLat / 2) +
        _cos(lat1Rad) * _cos(lat2Rad) * _sin(deltaLon / 2) * _sin(deltaLon / 2);
    final double c = 2 * _atan2(_sqrt(a), _sqrt(1 - a));

    return earthRadius * c;
  }

  /// Calculate bearing to another point in degrees
  double bearingTo(GeoPoint other) {
    final double lat1 = latitude * (3.141592653589793 / 180);
    final double lat2 = other.latitude * (3.141592653589793 / 180);
    final double deltaLon = (other.longitude - longitude) * (3.141592653589793 / 180);

    final double y = _sin(deltaLon) * _cos(lat2);
    final double x = _cos(lat1) * _sin(lat2) - _sin(lat1) * _cos(lat2) * _cos(deltaLon);

    final double bearing = _atan2(y, x) * (180 / 3.141592653589793);
    return (bearing + 360) % 360;
  }

  // Math helper functions (avoiding dart:math import for simplicity)
  static double _sin(double x) => _taylor_sin(x);
  static double _cos(double x) => _taylor_sin(x + 3.141592653589793 / 2);
  static double _sqrt(double x) => x > 0 ? _newton_sqrt(x) : 0;
  static double _atan2(double y, double x) => _atan2_impl(y, x);

  static double _taylor_sin(double x) {
    // Normalize to [-pi, pi]
    while (x > 3.141592653589793) x -= 2 * 3.141592653589793;
    while (x < -3.141592653589793) x += 2 * 3.141592653589793;
    
    double result = x;
    double term = x;
    for (int i = 1; i <= 10; i++) {
      term *= -x * x / ((2 * i) * (2 * i + 1));
      result += term;
    }
    return result;
  }

  static double _newton_sqrt(double x) {
    double guess = x / 2;
    for (int i = 0; i < 20; i++) {
      guess = (guess + x / guess) / 2;
    }
    return guess;
  }

  static double _atan2_impl(double y, double x) {
    if (x > 0) return _atan(y / x);
    if (x < 0 && y >= 0) return _atan(y / x) + 3.141592653589793;
    if (x < 0 && y < 0) return _atan(y / x) - 3.141592653589793;
    if (x == 0 && y > 0) return 3.141592653589793 / 2;
    if (x == 0 && y < 0) return -3.141592653589793 / 2;
    return 0;
  }

  static double _atan(double x) {
    if (x.abs() > 1) {
      return (x > 0 ? 1 : -1) * (3.141592653589793 / 2 - _atan(1 / x.abs()));
    }
    double result = x;
    double term = x;
    for (int i = 1; i <= 20; i++) {
      term *= -x * x;
      result += term / (2 * i + 1);
    }
    return result;
  }

  Map<String, dynamic> toJson() => {
        'latitude': latitude,
        'longitude': longitude,
        if (altitude != null) 'altitude': altitude,
        if (accuracy != null) 'accuracy': accuracy,
        if (timestamp != null) 'timestamp': timestamp!.toIso8601String(),
      };

  factory GeoPoint.fromJson(Map<String, dynamic> json) => GeoPoint(
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        altitude: json['altitude'] != null
            ? (json['altitude'] as num).toDouble()
            : null,
        accuracy: json['accuracy'] != null
            ? (json['accuracy'] as num).toDouble()
            : null,
        timestamp: json['timestamp'] != null
            ? DateTime.parse(json['timestamp'] as String)
            : null,
      );

  @override
  List<Object?> get props => [latitude, longitude, altitude, accuracy, timestamp];
}

/// A breadcrumb point for the breadcRums safety feature
class Breadcrumb extends GeoPoint {
  final int sequenceNumber;
  final bool isOffline;

  const Breadcrumb({
    required super.latitude,
    required super.longitude,
    super.altitude,
    super.accuracy,
    super.timestamp,
    required this.sequenceNumber,
    this.isOffline = false,
  });

  @override
  List<Object?> get props => [...super.props, sequenceNumber, isOffline];
}
