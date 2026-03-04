import 'package:amplify_api/amplify_api.dart';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:amplify_storage_s3/amplify_storage_s3.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart';
import 'package:on_your_mark/amplifyconfiguration.dart';
import 'package:on_your_mark/core/config/environment.dart';
import 'package:on_your_mark/core/di/injection.dart';
import 'package:on_your_mark/core/router/app_router.dart';
import 'package:on_your_mark/core/theme/app_theme.dart';
import 'package:on_your_mark/presentation/bloc/app_bloc_observer.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize dependency injection
  await configureDependencies();
  
  // Set up Bloc observer for debugging
  Bloc.observer = AppBlocObserver();
  
  // Initialize Amplify
  await _configureAmplify();
  
  // Initialize Mapbox
  await _configureMapbox();
  
  runApp(const OnYourMarkApp());
}

Future<void> _configureAmplify() async {
  try {
    await Amplify.addPlugins([
      AmplifyAuthCognito(),
      AmplifyAPI(),
      AmplifyStorageS3(),
    ]);
    await Amplify.configure(amplifyconfig);
    debugPrint('Amplify configured successfully');
  } catch (e) {
    debugPrint('Amplify configuration error: $e');
  }
}

Future<void> _configureMapbox() async {
  MapboxOptions.setAccessToken(Environment.mapboxAccessToken);
  debugPrint('Mapbox configured');
}

class OnYourMarkApp extends StatelessWidget {
  const OnYourMarkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'on your Mark!',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      routerConfig: AppRouter.router,
    );
  }
}
