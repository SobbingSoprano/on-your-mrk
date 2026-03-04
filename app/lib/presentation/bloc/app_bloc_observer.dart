import 'package:flutter_bloc/flutter_bloc.dart';

/// Bloc observer for debugging and logging state changes
class AppBlocObserver extends BlocObserver {
  @override
  void onCreate(BlocBase bloc) {
    super.onCreate(bloc);
    _log('onCreate', bloc.runtimeType.toString());
  }

  @override
  void onEvent(Bloc bloc, Object? event) {
    super.onEvent(bloc, event);
    _log('onEvent', '${bloc.runtimeType}: $event');
  }

  @override
  void onChange(BlocBase bloc, Change change) {
    super.onChange(bloc, change);
    _log('onChange', '${bloc.runtimeType}: $change');
  }

  @override
  void onTransition(Bloc bloc, Transition transition) {
    super.onTransition(bloc, transition);
    _log('onTransition', '${bloc.runtimeType}: $transition');
  }

  @override
  void onError(BlocBase bloc, Object error, StackTrace stackTrace) {
    super.onError(bloc, error, stackTrace);
    _log('onError', '${bloc.runtimeType}: $error\n$stackTrace');
  }

  @override
  void onClose(BlocBase bloc) {
    super.onClose(bloc);
    _log('onClose', bloc.runtimeType.toString());
  }

  void _log(String event, String message) {
    // In production, use proper logging service
    // For now, print in debug mode only
    assert(() {
      print('[$event] $message');
      return true;
    }());
  }
}
