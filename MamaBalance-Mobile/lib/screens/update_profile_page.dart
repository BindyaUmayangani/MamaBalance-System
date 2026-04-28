import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/mother_profile.dart';
import '../services/mother_profile_service.dart';
import '../utils/image_utils.dart';

class UpdateProfilePage extends StatefulWidget {
  const UpdateProfilePage({super.key});

  @override
  State<UpdateProfilePage> createState() => _UpdateProfilePageState();
}

class _UpdateProfilePageState extends State<UpdateProfilePage> {
  static const Color _mint = Color(0xFF4FA38A);
  static const Color _bg = Color(0xFFEFF8F4);
  static const Color _surface = Color(0xFFECF8F4);
  static const Color _text = Color(0xFF203C35);
  static const Color _muted = Color(0xFF60756D);

  final _formKey = GlobalKey<FormState>();
  final ImagePicker _imagePicker = ImagePicker();

  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _contactNumberController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _birthDateController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _guardianNameController = TextEditingController();
  final TextEditingController _guardianContactController = TextEditingController();
  final TextEditingController _deliveryDateController = TextEditingController();
  final TextEditingController _noOfChildrenController = TextEditingController();

  MotherProfile? _profile;
  File? _selectedProfileImage;
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isUploadingImage = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final profile = await MotherProfileService.instance.fetchCurrentProfile();
      _profile = profile;
      _fullNameController.text = profile.fullName == '-' ? '' : profile.fullName;
      _contactNumberController.text = profile.phoneNumber == '-' ? '' : profile.phoneNumber;
      _emailController.text = profile.personalEmail == '-' ? '' : profile.personalEmail;
      _birthDateController.text = profile.birthdate == '-' ? '' : profile.birthdate;
      _addressController.text = profile.address == '-' ? '' : profile.address;
      _guardianNameController.text = profile.guardianName == '-' ? '' : profile.guardianName;
      _guardianContactController.text = profile.guardianContact == '-' ? '' : profile.guardianContact;
      _deliveryDateController.text = profile.deliveryDate == '-' ? '' : profile.deliveryDate;
      _noOfChildrenController.text = profile.noOfChildren <= 0 ? '' : profile.noOfChildren.toString();
    } catch (error) {
      _error = '$error';
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _selectDate(BuildContext context, TextEditingController controller) async {
    DateTime initialDate = DateTime.now();
    if (controller.text.isNotEmpty) {
      try {
        initialDate = DateTime.parse(controller.text);
      } catch (_) {}
    }

    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(1900),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (picked != null) {
      controller.text = picked.toIso8601String().split('T')[0];
      setState(() {});
    }
  }

  Future<void> _pickProfileImage() async {
    if (_isUploadingImage) return;

    try {
      final picked = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 82,
        maxWidth: 480,
        maxHeight: 480,
      );

      if (picked == null) return;

      setState(() {
        _selectedProfileImage = File(picked.path);
        _isUploadingImage = true;
      });

      final updatedProfile = await MotherProfileService.instance
          .uploadProfileImage(_selectedProfileImage!);

      if (!mounted) return;
      setState(() {
        _profile = updatedProfile;
        _selectedProfileImage = null;
      });
      ScaffoldMessenger.of(context)
        ..clearSnackBars()
        ..showSnackBar(
          const SnackBar(
            content: Text('Profile picture updated successfully'),
            backgroundColor: _mint,
            behavior: SnackBarBehavior.floating,
          ),
        );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$error'),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isUploadingImage = false;
          _selectedProfileImage = null;
        });
      }
    }
  }

  ImageProvider _profileImageProvider() {
    if (_selectedProfileImage != null) {
      return FileImage(_selectedProfileImage!);
    }

    return ImageUtils.resolveProfileImage(_profile?.profileImageUrl);
  }

  bool get _hasProfileImage {
    return _selectedProfileImage != null ||
        ImageUtils.hasProfileImage(_profile?.profileImageUrl);
  }

  String get _profileInitials {
    final typedName = _fullNameController.text.trim();
    if (typedName.isNotEmpty) {
      return ImageUtils.profileInitials(typedName);
    }

    return ImageUtils.profileInitials(_profile?.fullName);
  }

  InputDecoration _inputDecoration({required String label, IconData? icon}) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: _muted),
      prefixIcon: icon == null ? null : Icon(icon, color: _mint),
      filled: true,
      fillColor: const Color(0xFFF9FCFB),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: Color(0xFFD7EAE3)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: Color(0xFFD7EAE3)),
      ),
      focusedBorder: const OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(18)),
        borderSide: BorderSide(color: _mint, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate() || _profile == null) {
      return;
    }

    setState(() => _isSaving = true);

    try {
      final nextProfile = _profile!.copyWith(
        fullName: _fullNameController.text.trim(),
        personalEmail: _emailController.text.trim(),
        phoneNumber: _contactNumberController.text.trim(),
        birthdate: _birthDateController.text.trim(),
        address: _addressController.text.trim(),
        guardianName: _guardianNameController.text.trim(),
        guardianContact: _guardianContactController.text.trim(),
        deliveryDate: _deliveryDateController.text.trim(),
        noOfChildren: int.tryParse(_noOfChildrenController.text.trim()) ?? 0,
      );

      await MotherProfileService.instance.updateCurrentProfile(nextProfile);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated successfully')),
      );
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$error')),
      );
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _contactNumberController.dispose();
    _emailController.dispose();
    _birthDateController.dispose();
    _addressController.dispose();
    _guardianNameController.dispose();
    _guardianContactController.dispose();
    _deliveryDateController.dispose();
    _noOfChildrenController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: _mint))
            : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: _text, fontSize: 16, fontWeight: FontWeight.w600)),
                    ),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                    child: Form(
                      key: _formKey,
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
                                  'Update Profile',
                                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: _text),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          const Padding(
                            padding: EdgeInsets.only(left: 48),
                            child: Text(
                              'Keep your contact and care details up to date for smoother support.',
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
                            child: Row(
                              children: [
                                GestureDetector(
                                  onTap: _pickProfileImage,
                                  child: Stack(
                                    children: [
                                      CircleAvatar(
                                        radius: 38,
                                        backgroundColor: Colors.white,
                                        backgroundImage:
                                            _hasProfileImage ? _profileImageProvider() : null,
                                        child: _hasProfileImage
                                            ? null
                                            : Text(
                                                _profileInitials,
                                                style: const TextStyle(
                                                  color: _mint,
                                                  fontSize: 24,
                                                  fontWeight: FontWeight.w800,
                                                ),
                                              ),
                                      ),
                                      Positioned(
                                        bottom: 0,
                                        right: 0,
                                        child: Container(
                                          padding: const EdgeInsets.all(6),
                                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
                                          child: _isUploadingImage
                                              ? const SizedBox(
                                                  width: 18,
                                                  height: 18,
                                                  child: CircularProgressIndicator(strokeWidth: 2, color: _mint),
                                                )
                                              : const Icon(Icons.camera_alt_outlined, color: _mint, size: 18),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(_fullNameController.text.trim().isEmpty ? 'Your name' : _fullNameController.text.trim(), style: const TextStyle(color: Colors.white, fontSize: 21, fontWeight: FontWeight.w700)),
                                      const SizedBox(height: 4),
                                      Text(_emailController.text.trim().isEmpty ? 'email@example.com' : _emailController.text.trim(), style: const TextStyle(color: Colors.white70, fontSize: 13)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),
                          _sectionCard(
                            title: 'Basic Information',
                            icon: Icons.person_outline_rounded,
                            children: [
                              _buildTextField('Full Name', _fullNameController, icon: Icons.person_outline),
                              const SizedBox(height: 14),
                              _buildTextField('Contact Number', _contactNumberController, keyboardType: TextInputType.phone, icon: Icons.phone_outlined),
                              const SizedBox(height: 14),
                              _buildEmailField('Personal Email', _emailController),
                              const SizedBox(height: 14),
                              _buildDatePickerField('Birth Date', _birthDateController),
                              const SizedBox(height: 14),
                              _buildTextField('Address', _addressController, icon: Icons.home_outlined),
                            ],
                          ),
                          const SizedBox(height: 14),
                          _sectionCard(
                            title: 'Family and Delivery',
                            icon: Icons.favorite_outline_rounded,
                            children: [
                              _buildTextField('Guardian Name', _guardianNameController, icon: Icons.family_restroom_outlined),
                              const SizedBox(height: 14),
                              _buildTextField('Guardian Contact Number', _guardianContactController, keyboardType: TextInputType.phone, icon: Icons.contact_phone_outlined),
                              const SizedBox(height: 14),
                              _buildDatePickerField('Delivery Date', _deliveryDateController),
                              const SizedBox(height: 14),
                              _buildTextField('No of Children', _noOfChildrenController, keyboardType: TextInputType.number, icon: Icons.child_care_outlined),
                            ],
                          ),
                          const SizedBox(height: 24),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: _isSaving ? null : () => Navigator.of(context).pop(),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: _mint),
                                    foregroundColor: _mint,
                                    padding: const EdgeInsets.symmetric(vertical: 15),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                                  ),
                                  child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700)),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: (_isSaving || _isUploadingImage) ? null : _saveProfile,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: _mint,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 15),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                                  ),
                                  child: Text(_isSaving ? 'Saving...' : 'Save Changes', style: const TextStyle(fontWeight: FontWeight.w700)),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
      ),
    );
  }

  Widget _sectionCard({required String title, required IconData icon, required List<Widget> children}) {
    return Container(
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
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, {TextInputType keyboardType = TextInputType.text, IconData? icon}) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      decoration: _inputDecoration(label: label, icon: icon),
      onChanged: (_) => setState(() {}),
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return 'Please enter $label';
        }
        return null;
      },
    );
  }

  Widget _buildEmailField(String label, TextEditingController controller) {
    return TextFormField(
      controller: controller,
      keyboardType: TextInputType.emailAddress,
      decoration: _inputDecoration(label: label, icon: Icons.alternate_email_rounded),
      onChanged: (_) => setState(() {}),
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return 'Please enter $label';
        }
        final emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
        if (!emailRegex.hasMatch(value.trim())) {
          return 'Please enter a valid email address';
        }
        return null;
      },
    );
  }

  Widget _buildDatePickerField(String label, TextEditingController controller) {
    return TextFormField(
      controller: controller,
      readOnly: true,
      decoration: _inputDecoration(label: label, icon: Icons.calendar_today_outlined),
      onTap: () => _selectDate(context, controller),
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return 'Please select $label';
        }
        return null;
      },
    );
  }
}

