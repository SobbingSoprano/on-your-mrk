import 'package:flutter/material.dart';

class ActiveRouteScreen extends StatelessWidget {
  final String routeId;

  const ActiveRouteScreen({super.key, required this.routeId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: const Center(child: Text('Active Route Navigation - TODO: Full screen map with navigation')),
    );
  }
}
