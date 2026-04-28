import 'dart:convert';
import 'package:flutter/material.dart';

class ImageUtils {
  static bool hasProfileImage(String? imageUrl) {
    return imageUrl != null && imageUrl.trim().isNotEmpty;
  }

  static String profileInitials(String? fullName) {
    final parts = (fullName ?? '')
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();

    if (parts.isEmpty) {
      return 'MB';
    }

    if (parts.length == 1) {
      final compact = parts.first.replaceAll(RegExp(r'[^A-Za-z0-9]'), '');
      if (compact.isEmpty) return 'MB';
      return compact.substring(0, compact.length >= 2 ? 2 : 1).toUpperCase();
    }

    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }

  /// Resolves an [ImageProvider] from a string that could be a URL, 
  /// a Base64 encoded string, or empty (falling back to default asset).
  static ImageProvider resolveProfileImage(String? imageUrl) {
    if (imageUrl == null || imageUrl.trim().isEmpty) {
      return const AssetImage('assets/images/profile.jpg');
    }

    final trimmed = imageUrl.trim();

    // 1. Handle Data URLs (Base64 with prefix)
    if (trimmed.startsWith('data:image/') && trimmed.contains('base64,')) {
      try {
        final base64String = trimmed.split('base64,').last;
        return MemoryImage(base64Decode(base64String));
      } catch (e) {
        debugPrint('Error decoding Base64 image: $e');
        return const AssetImage('assets/images/profile.jpg');
      }
    }

    // 2. Handle raw Base64 (heuristic: long string without common path characters)
    // Most UIDs/URLs have '/' or are relatively short. 
    // A Base64 image is thousands of chars long.
    if (trimmed.length > 200 && !trimmed.contains('/') && !trimmed.contains(':')) {
       try {
        return MemoryImage(base64Decode(trimmed));
      } catch (_) {
        // Fallback to NetworkImage if decoding fails
      }
    }

    // 3. Otherwise assume it's a standard URL
    return NetworkImage(trimmed);
  }
}
