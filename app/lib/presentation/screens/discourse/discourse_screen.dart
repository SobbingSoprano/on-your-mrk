import 'package:flutter/material.dart';

class DiscourseScreen extends StatelessWidget {
  final String sessionId;

  const DiscourseScreen({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("dis'Course'")),
      body: const Center(child: Text("dis'Course' Collaborative Session - TODO")),
    );
  }
}
