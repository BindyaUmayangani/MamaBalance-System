import 'dart:math' as math;

import 'package:flutter/material.dart';

class AppLoadingState extends StatefulWidget {
  final String title;
  final String message;
  final bool compact;
  final bool showLogo;
  final double size;
  final EdgeInsetsGeometry compactPadding;

  const AppLoadingState({
    super.key,
    this.title = 'Loading your care space',
    this.message = 'Please wait a moment while MamaBalance gets things ready.',
    this.compact = false,
    this.showLogo = true,
    this.size = 96,
    this.compactPadding = const EdgeInsets.all(18),
  });

  @override
  State<AppLoadingState> createState() => _AppLoadingStateState();
}

class _AppLoadingStateState extends State<AppLoadingState>
    with SingleTickerProviderStateMixin {
  static const Color _accent = Color(0xFF4A90C2);

  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1300),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final content = SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return CustomPaint(
            painter: _CareSpinnerPainter(progress: _controller.value),
            child: child,
          );
        },
        child:
            widget.showLogo
                ? Center(
                  child: Container(
                    width: widget.size * 0.6,
                    height: widget.size * 0.6,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFD6EAF5)),
                      boxShadow: [
                        BoxShadow(
                          color: _accent.withValues(alpha: 0.14),
                          blurRadius: 18,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Image.asset(
                      'assets/images/MamaBalance_icon.png',
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) {
                        return const Icon(
                          Icons.volunteer_activism_rounded,
                          color: _accent,
                        );
                      },
                    ),
                  ),
                )
                : null,
      ),
    );

    if (widget.compact) {
      return Center(
        child: Padding(padding: widget.compactPadding, child: content),
      );
    }

    return Center(
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: DecoratedBox(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                colors: [Color(0x66FFFFFF), Color(0x00FFFFFF)],
                radius: 0.95,
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
              child: content,
            ),
          ),
        ),
      ),
    );
  }
}

class _CareSpinnerPainter extends CustomPainter {
  final double progress;

  const _CareSpinnerPainter({required this.progress});

  static const Color _track = Color(0xFFEAF6FC);
  static const Color _trackBorder = Color(0xFFD6EAF5);
  static const Color _accent = Color(0xFF4A90C2);
  static const Color _accentLight = Color(0xFF7EC8E3);
  static const Color _accentDeep = Color(0xFF1F6F99);

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final strokeWidth = math.max(3.0, size.shortestSide * 0.0625);
    final radius = size.shortestSide / 2 - strokeWidth;
    final rect = Rect.fromCircle(center: center, radius: radius);

    final trackPaint =
        Paint()
          ..color = _track
          ..style = PaintingStyle.stroke
          ..strokeWidth = strokeWidth
          ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, trackPaint);
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = _trackBorder
        ..style = PaintingStyle.stroke
        ..strokeWidth = math.max(0.8, strokeWidth * 0.16),
    );

    final start = progress * 2 * math.pi - math.pi / 2;
    final primaryPaint =
        Paint()
          ..shader = const SweepGradient(
            colors: [_accent, _accentLight, _accentDeep, _accent],
          ).createShader(rect)
          ..style = PaintingStyle.stroke
          ..strokeWidth = strokeWidth
          ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, start, math.pi * 1.18, false, primaryPaint);

    final dotPaint = Paint()..color = _accentDeep;
    final dotAngle = start + math.pi * 1.18;
    final dotOffset = Offset(
      center.dx + math.cos(dotAngle) * radius,
      center.dy + math.sin(dotAngle) * radius,
    );
    canvas.drawCircle(dotOffset, math.max(2.2, strokeWidth * 0.66), dotPaint);
  }

  @override
  bool shouldRepaint(covariant _CareSpinnerPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
