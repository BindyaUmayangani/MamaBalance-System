import 'package:flutter/material.dart';

import '../models/mother_profile.dart';
import '../services/mother_profile_service.dart';
import 'update_profile_page.dart';
import '../utils/image_utils.dart';

class ProfileDetailsPage extends StatelessWidget {
  const ProfileDetailsPage({super.key});

  static const Color _mint = Color(0xFF4FA38A);
  static const Color _bg = Color(0xFFEFF8F4);
  static const Color _surface = Color(0xFFECF8F4);
  static const Color _text = Color(0xFF203C35);
  static const Color _muted = Color(0xFF60756D);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: FutureBuilder<MotherProfile>(
          future: MotherProfileService.instance.fetchCurrentProfile(),
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator(color: _mint));
            }

            if (snapshot.hasError || !snapshot.hasData) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    'Unable to load your details right now.',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: _text),
                    textAlign: TextAlign.center,
                  ),
                ),
              );
            }

            final profile = snapshot.data!;

            return SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _text),
                        onPressed: () => Navigator.of(context).pop(),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Profile Details',
                          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: _text),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Padding(
                    padding: EdgeInsets.only(left: 48),
                    child: Text(
                      'A quick view of your account, contact, and family details.',
                      style: TextStyle(fontSize: 14, color: _muted, height: 1.45),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF67BBA1), Color(0xFF4FA38A)],
                      ),
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: [BoxShadow(color: _mint.withOpacity(0.18), blurRadius: 22, offset: const Offset(0, 12))],
                    ),
                    child: Column(
                      children: [
                        CircleAvatar(
                          radius: 42,
                          backgroundColor: Colors.white,
                          backgroundImage: ImageUtils.resolveProfileImage(profile.profileImageUrl),
                        ),
                        const SizedBox(height: 12),
                        Text(profile.fullName, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        const Text('MamaBalance mother account', style: TextStyle(color: Colors.white70, fontSize: 13)),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(child: _heroChip(Icons.phone_outlined, profile.phoneNumber)),
                            const SizedBox(width: 10),
                            Expanded(child: _heroChip(Icons.email_outlined, profile.personalEmail)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  _sectionCard(
                    title: 'Personal Information',
                    icon: Icons.person_outline_rounded,
                    children: [
                      _buildDetailTile(Icons.badge_outlined, 'Full Name', profile.fullName),
                      _buildDetailTile(Icons.phone_outlined, 'Contact Number', profile.phoneNumber),
                      _buildDetailTile(Icons.alternate_email_rounded, 'Personal Email', profile.personalEmail),
                      _buildDetailTile(Icons.mail_outline_rounded, 'Login Email', profile.loginEmail),
                      _buildDetailTile(Icons.cake_outlined, 'Birth Date', profile.birthdate),
                      _buildDetailTile(Icons.home_outlined, 'Address', profile.address),
                    ],
                  ),
                  const SizedBox(height: 14),
                  if ((profile.assignedDoctorUid?.trim().isNotEmpty == true &&
                          profile.assignedDoctorPhoneNumber.trim().isNotEmpty) ||
                      (profile.assignedMidwifeUid?.trim().isNotEmpty == true &&
                          profile.assignedMidwifePhoneNumber.trim().isNotEmpty)) ...[
                    _sectionCard(
                      title: 'Assigned Care Team',
                      icon: Icons.support_agent_rounded,
                      children: [
                        if (profile.assignedDoctorUid?.trim().isNotEmpty ==
                                true &&
                            profile.assignedDoctorPhoneNumber.trim().isNotEmpty)
                          _buildDetailTile(
                            Icons.local_hospital_outlined,
                            'Assigned Doctor',
                            '${profile.assignedDoctorName.trim().isNotEmpty ? profile.assignedDoctorName : 'Assigned doctor'}\n${profile.assignedDoctorPhoneNumber}',
                          ),
                        if (profile.assignedMidwifeUid?.trim().isNotEmpty ==
                                true &&
                            profile.assignedMidwifePhoneNumber.trim().isNotEmpty)
                          _buildDetailTile(
                            Icons.health_and_safety_outlined,
                            'Assigned Midwife',
                            '${profile.assignedMidwifeName.trim().isNotEmpty ? profile.assignedMidwifeName : 'Assigned midwife'}\n${profile.assignedMidwifePhoneNumber}',
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),
                  ],
                  _sectionCard(
                    title: 'Family and Care Details',
                    icon: Icons.favorite_outline_rounded,
                    children: [
                      _buildDetailTile(Icons.family_restroom_outlined, 'Guardian Name', profile.guardianName),
                      _buildDetailTile(Icons.contact_phone_outlined, 'Guardian Contact', profile.guardianContact),
                      _buildDetailTile(Icons.event_available_outlined, 'Delivery Date', profile.deliveryDate),
                      _buildDetailTile(Icons.child_care_outlined, 'No of Children', '${profile.noOfChildren}'),
                    ],
                  ),
                  const SizedBox(height: 22),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        final updated = await Navigator.push<bool>(
                          context,
                          MaterialPageRoute(builder: (_) => const UpdateProfilePage()),
                        );
                        if (updated == true && context.mounted) {
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute(builder: (_) => const ProfileDetailsPage()),
                          );
                        }
                      },
                      icon: const Icon(Icons.edit_outlined),
                      label: const Text('Update Profile Details'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _mint,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                        textStyle: const TextStyle(fontWeight: FontWeight.w800),
                      ),
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

  Widget _heroChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.16),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.22)),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionCard({required String title, required IconData icon, required List<Widget> children}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFD7EAE3)),
        boxShadow: [BoxShadow(color: _mint.withOpacity(0.08), blurRadius: 18, offset: const Offset(0, 10))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(color: _surface, borderRadius: BorderRadius.circular(14)),
                child: Icon(icon, color: _mint),
              ),
              const SizedBox(width: 12),
              Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: _text)),
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  Widget _buildDetailTile(IconData icon, String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FCFB),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2EFEB)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(color: _surface, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: _mint, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _muted)),
                const SizedBox(height: 4),
                Text(value, style: const TextStyle(fontSize: 15, color: _text, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
