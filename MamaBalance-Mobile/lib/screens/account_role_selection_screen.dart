import 'package:flutter/material.dart';

class AccountRoleSelectionScreen extends StatelessWidget {
  const AccountRoleSelectionScreen({super.key});

  static const Color _accent = Color(0xFF4A90C2);
  static const Color _text = Color(0xFF1F3A5F);
  static const Color _muted = Color(0xFF5F7285);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3FAFD),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compact = constraints.maxHeight < 720;
            final tight = constraints.maxHeight < 640;
            final horizontalPadding = compact ? 20.0 : 24.0;
            final topPadding = tight ? 14.0 : (compact ? 36.0 : 52.0);
            final heroSize = tight ? 84.0 : (compact ? 142.0 : 204.0);
            final cardHeight = tight ? 114.0 : (compact ? 156.0 : 188.0);
            final cardGap = tight ? 12.0 : (compact ? 18.0 : 24.0);
            final noteGap = compact ? 8.0 : 10.0;

            return Padding(
              padding: EdgeInsets.fromLTRB(
                horizontalPadding,
                topPadding,
                horizontalPadding,
                compact ? 14 : 22,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _TopBadge(compact: compact),
                  SizedBox(height: compact ? 8 : 12),
                  Center(child: _HeroImage(size: heroSize)),
                  SizedBox(height: compact ? 10 : 14),
                  Text(
                    'Choose Your Account',
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: compact ? 26 : 30,
                      fontWeight: FontWeight.w800,
                      color: _text,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Select the role linked to your MamaBalance profile.',
                    textAlign: TextAlign.center,
                    maxLines: tight ? 1 : 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14.5,
                      color: _muted,
                      height: 1.4,
                    ),
                  ),
                  SizedBox(height: compact ? 12 : 18),
                  SizedBox(
                    height: cardHeight,
                    child: _RoleCard(
                      compact: compact,
                      showSubtitle: !tight,
                      showFeatures: !tight,
                      icon: Icons.favorite_border_rounded,
                      title: 'Mother Account',
                      subtitle:
                          'Email, password, or phone sign-in for mothers.',
                      features: const ['Wellbeing check-ins', 'Care updates'],
                      actionLabel: 'Continue as Mother',
                      onTap: () {
                        Navigator.pushNamed(context, '/mother-signin');
                      },
                    ),
                  ),
                  SizedBox(height: cardGap),
                  SizedBox(
                    height: cardHeight,
                    child: _RoleCard(
                      compact: compact,
                      showSubtitle: !tight,
                      showFeatures: !tight,
                      icon: Icons.family_restroom_outlined,
                      title: 'Guardian Account',
                      subtitle: 'Phone OTP access for linked guardians.',
                      features: const [
                        'Linked mother view',
                        'Support guidance',
                      ],
                      actionLabel: 'Continue as Guardian',
                      onTap: () {
                        Navigator.pushNamed(context, '/guardian-signin');
                      },
                    ),
                  ),
                  const Spacer(),
                  SizedBox(height: noteGap),
                  _SecurityNote(compact: compact),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SecurityNote extends StatelessWidget {
  const _SecurityNote({required this.compact});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(minHeight: compact ? 44 : 52),
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 12 : 14,
        vertical: compact ? 9 : 11,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF6FC),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFD6EAF5)),
      ),
      child: Row(
        children: [
          Container(
            width: compact ? 28 : 32,
            height: compact ? 28 : 32,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.lock_outline_rounded,
              size: 17,
              color: AccountRoleSelectionScreen._accent,
            ),
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Text(
              'Your role keeps care information private and secure.',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: AccountRoleSelectionScreen._muted,
                fontSize: 12.5,
                height: 1.25,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TopBadge extends StatelessWidget {
  const _TopBadge({required this.compact});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: compact ? 12 : 14,
          vertical: compact ? 7 : 8,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: const Color(0xFFD6EAF5)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.health_and_safety_outlined,
              size: 17,
              color: AccountRoleSelectionScreen._accent,
            ),
            SizedBox(width: 8),
            Text(
              'MamaBalance',
              style: TextStyle(
                color: AccountRoleSelectionScreen._text,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroImage extends StatelessWidget {
  const _HeroImage({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: AccountRoleSelectionScreen._accent.withValues(alpha: 0.14),
            blurRadius: 24,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: ClipOval(
        child: Image.asset('assets/images/signin.png', fit: BoxFit.cover),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.compact,
    required this.showSubtitle,
    required this.showFeatures,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.features,
    required this.actionLabel,
    required this.onTap,
  });

  final bool compact;
  final bool showSubtitle;
  final bool showFeatures;
  final IconData icon;
  final String title;
  final String subtitle;
  final List<String> features;
  final String actionLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dense = !showSubtitle && !showFeatures;

    return Container(
      padding: EdgeInsets.all(dense ? 9 : (compact ? 14 : 16)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD6EAF5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: dense ? 40 : (compact ? 46 : 52),
                height: dense ? 40 : (compact ? 46 : 52),
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF6FC),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, color: AccountRoleSelectionScreen._accent),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: compact ? 17 : 19,
                        fontWeight: FontWeight.w800,
                        color: AccountRoleSelectionScreen._text,
                      ),
                    ),
                    if (showSubtitle) ...[
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.35,
                          color: AccountRoleSelectionScreen._muted,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          if (showFeatures) ...[
            SizedBox(height: compact ? 7 : 8),
            Row(
              children: [
                Expanded(child: _FeaturePill(label: features[0])),
                const SizedBox(width: 8),
                Expanded(child: _FeaturePill(label: features[1])),
              ],
            ),
          ],
          SizedBox(height: dense ? 4 : (compact ? 7 : 9)),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onTap,
              style: ElevatedButton.styleFrom(
                backgroundColor: AccountRoleSelectionScreen._accent,
                foregroundColor: Colors.white,
                elevation: 0,
                minimumSize: Size.fromHeight(dense ? 38 : (compact ? 42 : 46)),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                padding: EdgeInsets.symmetric(
                  vertical: dense ? 7 : (compact ? 10 : 11),
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Text(
                actionLabel,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FeaturePill extends StatelessWidget {
  const _FeaturePill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFFF3FAFD),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFD6EAF5)),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: AccountRoleSelectionScreen._muted,
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
