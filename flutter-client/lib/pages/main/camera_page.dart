import 'dart:io';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

class CameraPage extends StatelessWidget {
  const CameraPage({super.key});

  @override
  Widget build(BuildContext context) {
    if (Platform.isAndroid) {
      return const Center(child: CamVideoPlayer());
    } else {
      return const HowToCam();
    }
  }
}

class CamVideoPlayer extends StatefulWidget {
  const CamVideoPlayer({super.key});

  @override
  State<CamVideoPlayer> createState() => _CamVideoPlayerState();
}

class _CamVideoPlayerState extends State<CamVideoPlayer> {
  late VideoPlayerController _controller;

  @override
  void initState() {
    super.initState();
    _controller =
        VideoPlayerController.networkUrl(
            Uri.parse('rtsp://192.168.100.11:8554/frontcam'),
          )
          //Uri.parse('http://192.168.100.11:8888/frontcam/index.m3u8')) // freezes up
          ..initialize().then((_) {
            // Ensure the first frame is shown after the video is initialized,
            // even before the play button has been pressed.
            setState(() {});
            _controller.play();
          });
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_controller.value.isInitialized) {
      if (_controller.value.hasError) {
        return HowToCam(errorDescription: _controller.value.errorDescription);
      }
      return AspectRatio(
        aspectRatio: _controller.value.aspectRatio,
        child: VideoPlayer(_controller),
      );
    } else {
      return const CircularProgressIndicator();
    }
  }
}

class HowToCam extends StatelessWidget {
  final String? errorDescription;
  const HowToCam({super.key, this.errorDescription});

  @override
  Widget build(BuildContext context) => Column(
    children: <Widget>[
      if (errorDescription != null)
        const Text(
          'Could not load the stream.  See the below error message for more'
          ' info. This could be for a variety of reasons'
          ',including loss of connection to the car, the camera is not '
          'connected, or even in some cases of car inactivity.'
          'Consider reloading when the car is active (HV on).',
        ),
      const SizedBox(height: 10),
      Text('Error: ${errorDescription ?? 'Platform Unsupported!'}'),
      const SizedBox(height: 10),
      const Text(
        'You might have better luck, get a more descriptive '
        'error message, or just get better performance overall by '
        'trying one of the below browser links.',
      ),
      const SizedBox(height: 15),
      ElevatedButton(
        onPressed: () async {
          if (!await launchUrl(
            Uri.parse('http://192.168.100.11:8889/frontcam'),
          )) {
            throw Exception('Could not launch via WebRTC');
          }
        },
        child: const Text('Launch WebRTC Stream'),
      ),
      const SizedBox(height: 5),
      TextButton(
        onPressed: () async {
          if (!await launchUrl(
            Uri.parse('http://192.168.100.11:8888/frontcam'),
          )) {
            throw Exception('Could not launch via HLS');
          }
        },
        child: const Text('Launch HLS Stream'),
      ),
    ],
  );
}
