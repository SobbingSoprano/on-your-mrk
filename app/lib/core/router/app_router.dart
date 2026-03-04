import 'package:go_router/go_router.dart';
import 'package:on_your_mark/presentation/screens/screens.dart';

class AppRouter {
  AppRouter._();

  static final router = GoRouter(
    initialLocation: Routes.splash,
    routes: [
      // Splash & Onboarding
      GoRoute(
        path: Routes.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: Routes.onboarding,
        builder: (context, state) => const OnboardingScreen(),
      ),
      
      // Authentication
      GoRoute(
        path: Routes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: Routes.register,
        builder: (context, state) => const RegisterScreen(),
      ),
      
      // Main App Shell
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: Routes.home,
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: Routes.explore,
            builder: (context, state) => const ExploreScreen(),
          ),
          GoRoute(
            path: Routes.create,
            builder: (context, state) => const CreateRouteScreen(),
          ),
          GoRoute(
            path: Routes.activity,
            builder: (context, state) => const ActivityScreen(),
          ),
          GoRoute(
            path: Routes.profile,
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
      
      // Route Navigation (Active Run/Walk)
      GoRoute(
        path: Routes.activeRoute,
        builder: (context, state) => ActiveRouteScreen(
          routeId: state.pathParameters['id']!,
        ),
      ),
      
      // Course Details
      GoRoute(
        path: Routes.courseDetail,
        builder: (context, state) => CourseDetailScreen(
          courseId: state.pathParameters['id']!,
        ),
      ),
      
      // dis'Course' - Collaborative Routes
      GoRoute(
        path: Routes.discourse,
        builder: (context, state) => DiscourseScreen(
          sessionId: state.pathParameters['id']!,
        ),
      ),
      
      // Safety
      GoRoute(
        path: Routes.emergencyContacts,
        builder: (context, state) => const EmergencyContactsScreen(),
      ),
      GoRoute(
        path: Routes.safetySettings,
        builder: (context, state) => const SafetySettingsScreen(),
      ),
      
      // Settings
      GoRoute(
        path: Routes.settings,
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
  );
}

class Routes {
  Routes._();

  static const String splash = '/';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String register = '/register';
  static const String home = '/home';
  static const String explore = '/explore';
  static const String create = '/create';
  static const String activity = '/activity';
  static const String profile = '/profile';
  static const String activeRoute = '/route/:id/active';
  static const String courseDetail = '/course/:id';
  static const String discourse = '/discourse/:id';
  static const String emergencyContacts = '/safety/contacts';
  static const String safetySettings = '/safety/settings';
  static const String settings = '/settings';
}
