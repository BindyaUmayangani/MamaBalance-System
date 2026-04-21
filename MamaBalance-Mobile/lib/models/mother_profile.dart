class MotherProfile {
  final String uid;
  final String fullName;
  final String loginEmail;
  final String personalEmail;
  final String phoneNumber;
  final String birthdate;
  final String address;
  final String guardianName;
  final String guardianContact;
  final String deliveryDate;
  final int noOfChildren;
  final String profileImageUrl;
  final String profileImagePath;
  final String? assignedDoctorUid;
  final String? assignedMidwifeUid;
  final String assignedDoctorName;
  final String assignedDoctorPhoneNumber;
  final String assignedMidwifeName;
  final String assignedMidwifePhoneNumber;
  final int latestEpdsScore;
  final DateTime? latestEpdsDate;

  const MotherProfile({
    required this.uid,
    required this.fullName,
    required this.loginEmail,
    required this.personalEmail,
    required this.phoneNumber,
    required this.birthdate,
    required this.address,
    required this.guardianName,
    required this.guardianContact,
    required this.deliveryDate,
    required this.noOfChildren,
    required this.profileImageUrl,
    required this.profileImagePath,
    this.assignedDoctorUid,
    this.assignedMidwifeUid,
    this.assignedDoctorName = '',
    this.assignedDoctorPhoneNumber = '',
    this.assignedMidwifeName = '',
    this.assignedMidwifePhoneNumber = '',
    this.latestEpdsScore = 0,
    this.latestEpdsDate,
  });

  String get firstName {
    final trimmed = fullName.trim();
    if (trimmed.isEmpty) return 'Mother';
    return trimmed.split(RegExp(r'\s+')).first;
  }

  MotherProfile copyWith({
    String? fullName,
    String? personalEmail,
    String? phoneNumber,
    String? birthdate,
    String? address,
    String? guardianName,
    String? guardianContact,
    String? deliveryDate,
    int? noOfChildren,
    String? profileImageUrl,
    String? profileImagePath,
    String? assignedDoctorUid,
    String? assignedMidwifeUid,
    String? assignedDoctorName,
    String? assignedDoctorPhoneNumber,
    String? assignedMidwifeName,
    String? assignedMidwifePhoneNumber,
    int? latestEpdsScore,
    DateTime? latestEpdsDate,
  }) {
    return MotherProfile(
      uid: uid,
      fullName: fullName ?? this.fullName,
      loginEmail: loginEmail,
      personalEmail: personalEmail ?? this.personalEmail,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      birthdate: birthdate ?? this.birthdate,
      address: address ?? this.address,
      guardianName: guardianName ?? this.guardianName,
      guardianContact: guardianContact ?? this.guardianContact,
      deliveryDate: deliveryDate ?? this.deliveryDate,
      noOfChildren: noOfChildren ?? this.noOfChildren,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      profileImagePath: profileImagePath ?? this.profileImagePath,
      assignedDoctorUid: assignedDoctorUid ?? this.assignedDoctorUid,
      assignedMidwifeUid: assignedMidwifeUid ?? this.assignedMidwifeUid,
      assignedDoctorName: assignedDoctorName ?? this.assignedDoctorName,
      assignedDoctorPhoneNumber:
          assignedDoctorPhoneNumber ?? this.assignedDoctorPhoneNumber,
      assignedMidwifeName: assignedMidwifeName ?? this.assignedMidwifeName,
      assignedMidwifePhoneNumber:
          assignedMidwifePhoneNumber ?? this.assignedMidwifePhoneNumber,
      latestEpdsScore: latestEpdsScore ?? this.latestEpdsScore,
      latestEpdsDate: latestEpdsDate ?? this.latestEpdsDate,
    );
  }
}
