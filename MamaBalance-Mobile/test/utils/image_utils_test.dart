import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mamabalance/utils/image_utils.dart';

void main() {
  group('ImageUtils', () {
    test('falls back to default asset for empty profile image', () {
      final provider = ImageUtils.resolveProfileImage('   ');

      expect(provider, isA<AssetImage>());
      expect((provider as AssetImage).assetName, 'assets/images/profile.jpg');
    });

    test('decodes data URL images into memory providers', () {
      const onePixelPng =
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

      final provider = ImageUtils.resolveProfileImage(
        'data:image/png;base64,$onePixelPng',
      );

      expect(provider, isA<MemoryImage>());
    });

    test('uses network provider for normal URLs', () {
      final provider = ImageUtils.resolveProfileImage(
        'https://example.com/profile.jpg',
      );

      expect(provider, isA<NetworkImage>());
      expect((provider as NetworkImage).url, 'https://example.com/profile.jpg');
    });
  });
}
