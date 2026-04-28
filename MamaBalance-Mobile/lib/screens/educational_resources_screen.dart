import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';

class EducationalResource {
  const EducationalResource({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.resourceUrl,
    required this.posterUrl,
    required this.createdAt,
  });

  final String id;
  final String title;
  final String description;
  final String type;
  final String resourceUrl;
  final String? posterUrl;
  final DateTime? createdAt;

  factory EducationalResource.fromJson(Map<String, dynamic> data) {
    return EducationalResource(
      id: _readString(data['id']),
      title: _readString(data['title'], fallback: 'Untitled resource'),
      description: _readString(data['description']),
      type: _readString(data['type'], fallback: 'link'),
      resourceUrl: _readString(data['resourceUrl']),
      posterUrl: _nullableString(data['posterUrl']),
      createdAt: DateTime.tryParse(_readString(data['createdAt'])),
    );
  }

  bool get hasResource => resourceUrl.trim().isNotEmpty;
  bool get isPdf => type == 'pdf';

  String get typeLabel {
    switch (type) {
      case 'youtube':
        return 'YouTube';
      case 'video':
        return 'Video';
      case 'pdf':
        return 'PDF';
      default:
        return 'Article';
    }
  }

  IconData get icon {
    switch (type) {
      case 'youtube':
      case 'video':
        return Icons.play_circle_fill_rounded;
      case 'pdf':
        return Icons.picture_as_pdf_rounded;
      default:
        return Icons.article_rounded;
    }
  }
}

class EducationalResourcesScreen extends StatefulWidget {
  const EducationalResourcesScreen({
    super.key,
    this.showBackButton = false,
    this.audience = 'mother',
  });

  final bool showBackButton;
  final String audience;

  static const Color _mint = Color(0xFF4FA38A);
  static const Color _deepMint = Color(0xFF2F7D68);
  static const Color _bg = Color(0xFFEFF8F4);
  static const Color _text = Color(0xFF203C35);
  static const Color _muted = Color(0xFF60756D);
  static const Color _line = Color(0xFFD7EAE3);

  @override
  State<EducationalResourcesScreen> createState() =>
      _EducationalResourcesScreenState();
}

class _EducationalResourcesScreenState extends State<EducationalResourcesScreen> {
  late Future<List<EducationalResource>> _resourcesFuture;

  static const Color _mint = EducationalResourcesScreen._mint;
  static const Color _bg = EducationalResourcesScreen._bg;
  static const Color _text = EducationalResourcesScreen._text;
  static const Color _muted = EducationalResourcesScreen._muted;

  @override
  void initState() {
    super.initState();
    _resourcesFuture = _fetchResources();
  }

  Future<void> _refreshResources() async {
    setState(() {
      _resourcesFuture = _fetchResources();
    });
    await _resourcesFuture;
  }

  Future<List<EducationalResource>> _fetchResources() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      throw Exception('Please sign in to continue.');
    }

    final token = await user.getIdToken();
    if (token == null || token.trim().isEmpty) {
      throw Exception('Please sign in again to continue.');
    }

    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) {
      throw Exception('The mobile backend URL has not been configured.');
    }

    final uri = Uri.parse(
      '${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/resources',
    ).replace(queryParameters: {'audience': widget.audience});

    try {
      final response = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      ).timeout(const Duration(seconds: 20));
      final decoded = jsonDecode(response.body);
      final payload = decoded is Map<String, dynamic>
          ? decoded
          : <String, dynamic>{};
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception(payload['error'] ?? 'Unable to load resources.');
      }

      final rawResources = payload['resources'];
      final resources = (rawResources is List ? rawResources : const [])
          .whereType<Map<String, dynamic>>()
          .map(EducationalResource.fromJson)
          .where((resource) => resource.hasResource)
          .toList();

      return resources;
    } on TimeoutException {
      throw Exception('The resources request timed out.');
    } on SocketException {
      throw Exception('Unable to reach the resources backend.');
    } on FormatException {
      throw Exception('The resources backend returned an invalid response.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: FutureBuilder<List<EducationalResource>>(
          future: _resourcesFuture,
          builder: (context, snapshot) {
            final resources = snapshot.data ?? [];

            return RefreshIndicator(
              color: _mint,
              onRefresh: _refreshResources,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 28),
                children: [
                  Row(
                    children: [
                      if (widget.showBackButton) ...[
                        IconButton(
                          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _text),
                          onPressed: () => Navigator.pop(context),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                        ),
                        const SizedBox(width: 12),
                      ],
                      const Expanded(
                        child: Text(
                          'Educational Resources',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            color: _text,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Padding(
                    padding: EdgeInsets.only(left: widget.showBackButton ? 48 : 0),
                    child: const Text(
                      'Read trusted guides and resources shared by MamaBalance care administrators.',
                      style: TextStyle(fontSize: 15, height: 1.5, color: _muted),
                    ),
                  ),
                  const SizedBox(height: 22),
                  if (snapshot.connectionState == ConnectionState.waiting)
                    const _ResourceLoadingState()
                  else if (snapshot.hasError)
                    _ResourceMessageState(
                      icon: Icons.wifi_off_rounded,
                      title: 'Resources unavailable',
                      message:
                          'Please check your connection and try again. ${snapshot.error}',
                    )
                  else if (resources.isEmpty)
                    const _ResourceMessageState(
                      icon: Icons.menu_book_rounded,
                      title: 'No resources yet',
                      message:
                          'New educational content will appear here when it is published.',
                    )
                  else
                    ...resources.map(
                      (resource) => _ResourceCard(
                        resource: resource,
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => EducationalResourceDetailPage(
                                resource: resource,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

}

class EducationalResourceDetailPage extends StatelessWidget {
  const EducationalResourceDetailPage({super.key, required this.resource});

  final EducationalResource resource;

  static const Color _deepMint = EducationalResourcesScreen._deepMint;
  static const Color _bg = EducationalResourcesScreen._bg;
  static const Color _text = EducationalResourcesScreen._text;
  static const Color _muted = EducationalResourcesScreen._muted;
  static const Color _line = EducationalResourcesScreen._line;

  Future<void> _openResource(BuildContext context) async {
    final uri = Uri.tryParse(resource.resourceUrl);

    if (uri == null) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to open this resource.')),
        );
      }
      return;
    }

    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);

    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open this resource.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final actionLabel = resource.isPdf ? 'Download PDF' : 'View Resource';
    final dateLabel = _formatDate(resource.createdAt);

    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 28),
          children: [
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _text),
                  onPressed: () => Navigator.pop(context),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                ),
                const SizedBox(width: 4),
                const Expanded(
                  child: Text(
                    'Resource Details',
                    style: TextStyle(
                      color: _text,
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _ResourceHero(resource: resource),
            const SizedBox(height: 22),
            Row(
              children: [
                _TypePill(resource: resource),
                if (dateLabel.isNotEmpty) ...[
                  const SizedBox(width: 10),
                  Text(
                    dateLabel,
                    style: const TextStyle(
                      color: _muted,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 16),
            Text(
              resource.title,
              style: const TextStyle(
                color: _text,
                fontSize: 28,
                height: 1.15,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              resource.description,
              style: const TextStyle(color: _muted, fontSize: 15, height: 1.6),
            ),
            const SizedBox(height: 26),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed:
                    resource.hasResource ? () => _openResource(context) : null,
                icon: Icon(
                  resource.isPdf
                      ? Icons.download_rounded
                      : Icons.open_in_new_rounded,
                ),
                label: Text(actionLabel),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _deepMint,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: _line,
                  disabledForegroundColor: _muted,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  textStyle: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            if (resource.isPdf) ...[
              const SizedBox(height: 12),
              const Text(
                'The PDF will open in your browser or document app, where you can save it to your device.',
                style: TextStyle(color: _muted, fontSize: 13, height: 1.45),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ResourceCard extends StatelessWidget {
  const _ResourceCard({required this.resource, required this.onTap});

  final EducationalResource resource;
  final VoidCallback onTap;

  static const Color _mint = EducationalResourcesScreen._mint;
  static const Color _text = EducationalResourcesScreen._text;
  static const Color _muted = EducationalResourcesScreen._muted;
  static const Color _line = EducationalResourcesScreen._line;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: _line),
        boxShadow: [
          BoxShadow(
            color: _mint.withOpacity(0.08),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ResourceThumb(resource: resource, size: 88),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          _TypePill(resource: resource),
                          const Spacer(),
                          const Icon(Icons.chevron_right_rounded, color: _mint),
                        ],
                      ),
                      const SizedBox(height: 9),
                      Text(
                        resource.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: _text,
                        ),
                      ),
                      const SizedBox(height: 7),
                      Text(
                        resource.description,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          height: 1.4,
                          color: _muted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ResourceHero extends StatelessWidget {
  const _ResourceHero({required this.resource});

  final EducationalResource resource;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: SizedBox(
        height: 210,
        width: double.infinity,
        child: _ResourceVisual(resource: resource),
      ),
    );
  }
}

class _ResourceThumb extends StatelessWidget {
  const _ResourceThumb({required this.resource, required this.size});

  final EducationalResource resource;
  final double size;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        width: size,
        height: size,
        child: _ResourceVisual(resource: resource),
      ),
    );
  }
}

class _ResourceVisual extends StatelessWidget {
  const _ResourceVisual({required this.resource});

  final EducationalResource resource;

  static const Color _mint = EducationalResourcesScreen._mint;
  static const Color _deepMint = EducationalResourcesScreen._deepMint;

  @override
  Widget build(BuildContext context) {
    final posterUrl = resource.posterUrl;

    if (posterUrl != null && posterUrl.isNotEmpty) {
      return Image.network(
        posterUrl,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _ResourceIcon(resource: resource),
      );
    }

    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFDDF3EC), Color(0xFFFFFFFF)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: _mint.withOpacity(0.14),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Icon(resource.icon, color: _deepMint, size: 30),
        ),
      ),
    );
  }
}

class _ResourceIcon extends StatelessWidget {
  const _ResourceIcon({required this.resource});

  final EducationalResource resource;

  static const Color _deepMint = EducationalResourcesScreen._deepMint;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFDDF3EC),
      child: Icon(resource.icon, color: _deepMint, size: 32),
    );
  }
}

class _TypePill extends StatelessWidget {
  const _TypePill({required this.resource});

  final EducationalResource resource;

  static const Color _mint = EducationalResourcesScreen._mint;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: _mint.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(resource.icon, color: _mint, size: 15),
          const SizedBox(width: 5),
          Text(
            resource.typeLabel,
            style: const TextStyle(
              color: _mint,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _ResourceLoadingState extends StatelessWidget {
  const _ResourceLoadingState();

  static const Color _mint = EducationalResourcesScreen._mint;
  static const Color _muted = EducationalResourcesScreen._muted;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 46),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
      ),
      child: const Column(
        children: [
          CircularProgressIndicator(color: _mint),
          SizedBox(height: 16),
          Text(
            'Loading resources...',
            style: TextStyle(color: _muted, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _ResourceMessageState extends StatelessWidget {
  const _ResourceMessageState({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  static const Color _mint = EducationalResourcesScreen._mint;
  static const Color _text = EducationalResourcesScreen._text;
  static const Color _muted = EducationalResourcesScreen._muted;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 44),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        children: [
          Icon(icon, color: _mint, size: 38),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              color: _text,
              fontSize: 17,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: const TextStyle(color: _muted, fontSize: 14, height: 1.45),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

String _readString(Object? value, {String fallback = ''}) {
  if (value is String && value.trim().isNotEmpty) {
    return value.trim();
  }

  return fallback;
}

String? _nullableString(Object? value) {
  if (value is String && value.trim().isNotEmpty) {
    return value.trim();
  }

  return null;
}

String _formatDate(DateTime? date) {
  if (date == null) return '';

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return '${months[date.month - 1]} ${date.day}, ${date.year}';
}
