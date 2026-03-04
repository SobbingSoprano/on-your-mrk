import 'package:equatable/equatable.dart';
import 'geo_point.dart';
import 'course.dart';

/// dis'Course' - Collaborative relay session
class DiscourseSession extends Equatable {
  final String id;
  final String hostUserId;
  final String name;
  final Course course;
  final List<DiscourseParticipant> participants;
  final List<DiscourseSegment> segments;
  final DiscourseStatus status;
  final VoiceChatState voiceChatState;
  final DateTime scheduledStartTime;
  final DateTime? actualStartTime;
  final DateTime? completedAt;
  final DateTime createdAt;

  const DiscourseSession({
    required this.id,
    required this.hostUserId,
    required this.name,
    required this.course,
    required this.participants,
    required this.segments,
    required this.status,
    required this.voiceChatState,
    required this.scheduledStartTime,
    this.actualStartTime,
    this.completedAt,
    required this.createdAt,
  });

  DiscourseParticipant? get currentRunner =>
      participants.where((p) => p.status == ParticipantStatus.running).firstOrNull;

  DiscourseSegment? get currentSegment =>
      segments.where((s) => s.status == SegmentStatus.active).firstOrNull;

  double get overallProgress {
    final completed = segments.where((s) => s.status == SegmentStatus.completed).length;
    return segments.isNotEmpty ? completed / segments.length * 100 : 0;
  }

  @override
  List<Object?> get props => [
        id,
        hostUserId,
        name,
        course,
        participants,
        segments,
        status,
        voiceChatState,
        scheduledStartTime,
        actualStartTime,
        completedAt,
        createdAt,
      ];
}

enum DiscourseStatus {
  planning,
  waiting,
  active,
  completed,
  cancelled,
}

/// A participant in a dis'Course' session
class DiscourseParticipant extends Equatable {
  final String oderId;
  final String displayName;
  final String? profileImageUrl;
  final ParticipantStatus status;
  final int assignedSegmentIndex;
  final GeoPoint? currentLocation;
  final bool isVoiceMuted;
  final DateTime joinedAt;

  const DiscourseParticipant({
    required this.oderId,
    required this.displayName,
    this.profileImageUrl,
    required this.status,
    required this.assignedSegmentIndex,
    this.currentLocation,
    this.isVoiceMuted = false,
    required this.joinedAt,
  });

  @override
  List<Object?> get props => [
        oderId,
        displayName,
        profileImageUrl,
        status,
        assignedSegmentIndex,
        currentLocation,
        isVoiceMuted,
        joinedAt,
      ];
}

enum ParticipantStatus {
  waiting,
  ready,
  running,
  completed,
  spectating,
  disconnected,
}

/// A segment of the course assigned to a participant
class DiscourseSegment extends Equatable {
  final int index;
  final String? assignedUserId;
  final GeoPoint startPoint;
  final GeoPoint endPoint;
  final List<GeoPoint> path;
  final double distanceMeters;
  final SegmentStatus status;
  final DateTime? startedAt;
  final DateTime? completedAt;

  const DiscourseSegment({
    required this.index,
    this.assignedUserId,
    required this.startPoint,
    required this.endPoint,
    required this.path,
    required this.distanceMeters,
    required this.status,
    this.startedAt,
    this.completedAt,
  });

  @override
  List<Object?> get props => [
        index,
        assignedUserId,
        startPoint,
        endPoint,
        path,
        distanceMeters,
        status,
        startedAt,
        completedAt,
      ];
}

enum SegmentStatus {
  pending,
  active,
  completed,
}

/// Voice chat state for dis'Course' session
class VoiceChatState extends Equatable {
  final bool isActive;
  final List<String> activeParticipantIds;
  final String? channelId;
  final VoiceChatQuality quality;

  const VoiceChatState({
    this.isActive = false,
    this.activeParticipantIds = const [],
    this.channelId,
    this.quality = VoiceChatQuality.auto,
  });

  @override
  List<Object?> get props => [isActive, activeParticipantIds, channelId, quality];
}

enum VoiceChatQuality {
  low,
  medium,
  high,
  auto,
}
