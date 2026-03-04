/**
 * Shared Type Definitions
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  profileImageUrl?: string;
  profile: UserProfile;
  safetySettings: SafetySettings;
  stats?: UserStats;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  weightKg?: number;
  heightCm?: number;
  gender?: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
  fitnessLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ATHLETE';
  preferredActivities?: string[];
  healthKitEnabled?: boolean;
  googleFitEnabled?: boolean;
}

export interface SafetySettings {
  locationPingingEnabled: boolean;
  locationPingIntervalSeconds: number;
  awolEnabled: boolean;
  awolTimeoutMinutes: number;
  breadcrumbsEnabled: boolean;
  breadcrumbIntervalMeters: number;
  autoOfflineBreadcrumbs: boolean;
  emergencyButtonEnabled: boolean;
  emergencyMessage?: string;
}

export interface UserStats {
  totalDistanceMeters: number;
  totalTimeSeconds: number;
  totalRoutes: number;
  totalCoursesCreated: number;
  averagePaceMinPerKm: number;
}

export interface TrustedContact {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  notifyOnEmergency: boolean;
  notifyOnAwol: boolean;
  notifyOnLocationPing: boolean;
  createdAt: string;
}

export interface Course {
  id: string;
  creatorId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  waypoints: GeoPoint[];
  routePath: GeoPoint[];
  distanceMeters: number;
  elevationGainMeters: number;
  estimatedMinutes: number;
  difficulty: 'EASY' | 'MODERATE' | 'HARD' | 'EXPERT';
  trafficRating: TrafficRating;
  stats: CourseStats;
  tags?: string[];
  isPublic: boolean;
  isCollaborative: boolean;
  shapeDescription?: string;
  geohash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseStats {
  completionCount: number;
  averageRating: number;
  reviewCount: number;
  averageCompletionMinutes: number;
  favoriteCount: number;
}

export interface TrafficRating {
  pedestrianTraffic: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  vehicleTraffic: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  notes?: string;
  lastUpdated: string;
}

export interface ActiveRoute {
  id: string;
  userId: string;
  courseId?: string;
  status: 'PREPARING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'EMERGENCY';
  startPoint: GeoPoint;
  endPoint?: GeoPoint;
  currentLocation: GeoPoint;
  distanceCoveredMeters: number;
  elevationGainMeters: number;
  elapsedSeconds: number;
  estimatedSecondsRemaining?: number;
  navigationState?: NavigationState;
  safetyState: SafetyState;
  startedAt: string;
  completedAt?: string;
  lastUpdated: string;
  ttl?: number;
}

export interface NavigationState {
  nextWaypoint: GeoPoint;
  waypointIndex: number;
  totalWaypoints: number;
  distanceToNextMeters: number;
  currentInstruction: NavigationInstruction;
  upcomingInstruction?: NavigationInstruction;
}

export interface NavigationInstruction {
  maneuver: string;
  streetName: string;
  distanceMeters: number;
  spokenInstruction: string;
}

export interface SafetyState {
  isLocationPinging: boolean;
  lastPingSent?: string;
  isAwolActive: boolean;
  awolDeadline?: string;
  isOffline: boolean;
  wentOfflineAt?: string;
  breadcrumbCount: number;
  lastKnownLocation?: GeoPoint;
  lastServerContact: string;
}

export interface DiscourseSession {
  id: string;
  hostUserId: string;
  name: string;
  courseId: string;
  participants: DiscourseParticipant[];
  segments: DiscourseSegment[];
  status: 'PLANNING' | 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  voiceChatChannelId?: string;
  scheduledStartTime: string;
  actualStartTime?: string;
  completedAt?: string;
  createdAt: string;
}

export interface DiscourseParticipant {
  userId: string;
  displayName: string;
  profileImageUrl?: string;
  status: 'WAITING' | 'READY' | 'RUNNING' | 'COMPLETED' | 'SPECTATING' | 'DISCONNECTED';
  assignedSegmentIndex: number;
  currentLocation?: GeoPoint;
  isVoiceMuted: boolean;
  joinedAt: string;
}

export interface DiscourseSegment {
  index: number;
  assignedUserId?: string;
  startPoint: GeoPoint;
  endPoint: GeoPoint;
  distanceMeters: number;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  startedAt?: string;
  completedAt?: string;
}

export interface Review {
  id: string;
  courseId: string;
  userId: string;
  rating: number;
  title?: string;
  comment?: string;
  difficultyAccuracy?: number;
  trafficAccuracy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Breadcrumb {
  id: string;
  routeId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  sequenceNumber: number;
  isOffline: boolean;
  timestamp: string;
  ttl?: number;
}

export interface ParkingLocation {
  id: string;
  userId: string;
  location: GeoPoint;
  address?: string;
  notes?: string;
  savedAt: string;
  ttl?: number;
}

export interface EmergencyAlert {
  id: string;
  userId: string;
  userName: string;
  location: GeoPoint;
  message?: string;
  timestamp: string;
  contactsNotified: number;
}
