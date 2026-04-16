import 'package:flutter/material.dart';

import '../services/prescription_service.dart';

class PrescriptionPage extends StatefulWidget {
  const PrescriptionPage({super.key, this.showBackButton = false});

  final bool showBackButton;

  @override
  State<PrescriptionPage> createState() => _PrescriptionPageState();
}

class _PrescriptionPageState extends State<PrescriptionPage> {
  late Future<PrescriptionSummary> _prescriptionsFuture;
  bool _showHistory = false;
  int _activeMedicationPage = 1;
  int _medicationHistoryPage = 1;

  static const Color _accent = Color(0xFF4FA58D);
  static const Color _background = Color(0xFFF3FBF8);
  static const Color _surface = Color(0xFFECF8F4);
  static const Color _text = Color(0xFF173C3A);
  static const Color _muted = Color(0xFF6A7B79);
  static const int _medicationsPerPage = 1;

  @override
  void initState() {
    super.initState();
    _prescriptionsFuture =
        PrescriptionService.instance.fetchCurrentMotherPrescriptions();
  }

  void _reload() {
    setState(() {
      _prescriptionsFuture =
          PrescriptionService.instance.fetchCurrentMotherPrescriptions();
      _activeMedicationPage = 1;
      _medicationHistoryPage = 1;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        child: FutureBuilder<PrescriptionSummary>(
          future: _prescriptionsFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator(color: _accent));
            }

            if (snapshot.hasError) {
              return _stateView(
                icon: Icons.error_outline_rounded,
                title: 'Unable to load prescriptions',
                message: '${snapshot.error}',
                actionLabel: 'Try again',
                onAction: _reload,
              );
            }

            final summary = snapshot.data ??
                const PrescriptionSummary(
                  activeMedications: [],
                  medicationHistory: [],
                );

            return RefreshIndicator(
              color: _accent,
              onRefresh: () async => _reload(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
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
                          const SizedBox(width: 16),
                        ],
                        const Expanded(
                          child: Text(
                            'Prescriptions',
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
                      padding: EdgeInsets.only(left: widget.showBackButton ? 52 : 0),
                      child: const Text(
                        'Review the medicines, timing, and important care notes shared by your doctor.',
                        style: TextStyle(fontSize: 14, color: _muted, height: 1.45),
                      ),
                    ),
                    const SizedBox(height: 18),
                  _overviewCard(summary),
                  const SizedBox(height: 22),
                  _medicationToggle(summary),
                  const SizedBox(height: 18),
                  if (!_showHistory)
                    _medicationSection(
                      title: 'Active medications',
                      emptyTitle: 'No active medications',
                      emptyMessage:
                          'Medicines prescribed by your doctor will appear here.',
                      medications: summary.activeMedications,
                      currentPage: _activeMedicationPage,
                      isHistory: false,
                      onPageChanged: (page) =>
                          setState(() => _activeMedicationPage = page),
                    )
                  else
                    _medicationSection(
                      title: 'Medication history',
                      emptyTitle: 'No medication history',
                      emptyMessage:
                          'Completed or stopped medications will appear here.',
                      medications: summary.medicationHistory,
                      currentPage: _medicationHistoryPage,
                      isHistory: true,
                      onPageChanged: (page) =>
                          setState(() => _medicationHistoryPage = page),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    ),
  );
}

  Widget _medicationToggle(PrescriptionSummary summary) {
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFD6ECE6)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _toggleButton(
              label: 'Active',
              count: summary.activeMedications.length,
              selected: !_showHistory,
              onTap: () => setState(() => _showHistory = false),
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: _toggleButton(
              label: 'History',
              count: summary.medicationHistory.length,
              selected: _showHistory,
              onTap: () => setState(() => _showHistory = true),
            ),
          ),
        ],
      ),
    );
  }

  Widget _toggleButton({
    required String label,
    required int count,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        decoration: BoxDecoration(
          color: selected ? _accent : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        alignment: Alignment.center,
        child: Text(
          '$label ($count)',
          style: TextStyle(
            color: selected ? Colors.white : _text,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }

  Widget _overviewCard(PrescriptionSummary summary) {
    final latestActive =
        summary.activeMedications.isNotEmpty ? summary.activeMedications.first : null;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF67BBA1), Color(0xFF4FA58D)],
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: _accent.withOpacity(0.18),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Prescription overview',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: _heroChip('Active', '${summary.activeMedications.length}')),
              const SizedBox(width: 10),
              Expanded(child: _heroChip('History', '${summary.medicationHistory.length}')),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _heroChip('Latest', latestActive?.name ?? '-')),
              const SizedBox(width: 10),
              Expanded(
                child: _heroChip(
                  'Doctor',
                  _doctorName(latestActive?.prescribedBy ?? '-'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _medicationSection({
    required String title,
    required String emptyTitle,
    required String emptyMessage,
    required List<PrescriptionMedication> medications,
    required int currentPage,
    required bool isHistory,
    required ValueChanged<int> onPageChanged,
  }) {
    final totalPages = _totalPages(medications.length);
    final safePage = currentPage.clamp(1, totalPages).toInt();
    final startIndex = (safePage - 1) * _medicationsPerPage;
    final pageMedications = medications
        .skip(startIndex)
        .take(_medicationsPerPage)
        .toList(growable: false);

    if (safePage != currentPage) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          onPageChanged(safePage);
        }
      });
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(title, '${medications.length}'),
        const SizedBox(height: 10),
        if (medications.isEmpty)
          _emptyCard(emptyTitle, emptyMessage)
        else ...[
          ...pageMedications.map(
            (medication) => _medicationCard(medication, isHistory: isHistory),
          ),
          _paginationControls(
            currentPage: safePage,
            totalPages: totalPages,
            onPageChanged: onPageChanged,
          ),
        ],
      ],
    );
  }

  Widget _sectionHeader(String title, String count) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: _text,
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: _surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFD6ECE6)),
          ),
          child: Text(
            count,
            style: const TextStyle(color: _accent, fontWeight: FontWeight.w800),
          ),
        ),
      ],
    );
  }

  Widget _medicationCard(
    PrescriptionMedication medication, {
    required bool isHistory,
  }) {
    final detailRows = <_MedicationDetail>[
      _MedicationDetail(
        'Dosage',
        medication.dosage == '-' ? '-' : '${medication.dosage} mg',
      ),
      _MedicationDetail('Frequency', medication.frequency),
      _MedicationDetail('Start Date', medication.startDate),
      _MedicationDetail('End Date', medication.endDate),
      _MedicationDetail('Prescribed by', _doctorName(medication.prescribedBy)),
    ];

    if (isHistory) {
      detailRows.add(_MedicationDetail('Status', medication.status));
      detailRows.add(
        _MedicationDetail(
          'Reason Stopped',
          medication.reasonStopped.isEmpty ? '-' : medication.reasonStopped,
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFD6ECE6)),
        boxShadow: const [
          BoxShadow(color: Color(0x12000000), blurRadius: 12, offset: Offset(0, 5)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: isHistory ? const Color(0xFFF5F7F6) : _surface,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  isHistory ? Icons.history_rounded : Icons.medication_rounded,
                  color: isHistory ? _muted : _accent,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      medication.name,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: _text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      medication.isActive ? 'Active medication' : medication.status,
                      style: const TextStyle(
                        fontSize: 13,
                        color: _muted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...detailRows.map((detail) => _detailLine(detail.label, detail.value)),
          if (medication.instructions.isNotEmpty) ...[
            const SizedBox(height: 10),
            _noteBox('Instructions', medication.instructions),
          ],
          if (medication.notes.isNotEmpty) ...[
            const SizedBox(height: 10),
            _noteBox('Notes', medication.notes),
          ],
        ],
      ),
    );
  }

  Widget _detailLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 104,
            child: Text(
              label,
              style: const TextStyle(color: _muted, fontWeight: FontWeight.w600),
            ),
          ),
          Expanded(
            child: Text(
              value.isEmpty ? '-' : value,
              style: const TextStyle(color: _text, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _noteBox(String label, String value) {
    final points = _splitBulletPoints(value);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w700, color: _text)),
          const SizedBox(height: 6),
          ...points.map((point) => _bulletPoint(point)),
        ],
      ),
    );
  }

  List<String> _splitBulletPoints(String value) {
    final normalized = value.trim();
    if (normalized.isEmpty) {
      return [];
    }

    final lineItems = normalized
        .split(RegExp(r'[\n\r]+'))
        .map((item) => item.trim().replaceFirst(RegExp(r'^[-*\u2022]\s*'), ''))
        .where((item) => item.isNotEmpty)
        .toList();

    if (lineItems.length > 1) {
      return lineItems;
    }

    final sentenceItems = normalized
        .split(RegExp(r'[.!?]+'))
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList();

    return sentenceItems.isEmpty ? [normalized] : sentenceItems;
  }

  Widget _bulletPoint(String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 7),
            child: Icon(Icons.circle, size: 7, color: _accent),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(color: _muted, height: 1.45),
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptyCard(String title, String message) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFD6ECE6)),
      ),
      child: Column(
        children: [
          const Icon(Icons.local_pharmacy_outlined, color: _accent, size: 34),
          const SizedBox(height: 10),
          Text(title, style: const TextStyle(color: _text, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: _muted, height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _paginationControls({
    required int currentPage,
    required int totalPages,
    required ValueChanged<int> onPageChanged,
  }) {
    if (totalPages <= 1) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 2, bottom: 14),
      child: Row(
        children: [
          Expanded(
            child: _pagerButton(
              'Previous',
              currentPage > 1,
              () => onPageChanged(currentPage - 1),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Page $currentPage of $totalPages',
            style: const TextStyle(
              color: _muted,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _pagerButton(
              'Next',
              currentPage < totalPages,
              () => onPageChanged(currentPage + 1),
            ),
          ),
        ],
      ),
    );
  }

  Widget _pagerButton(String label, bool enabled, VoidCallback onTap) {
    return SizedBox(
      height: 42,
      child: ElevatedButton(
        onPressed: enabled ? onTap : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: enabled ? _accent : const Color(0xFFE6EFEC),
          foregroundColor: enabled ? Colors.white : const Color(0xFF86A09A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
        child: Text(label),
      ),
    );
  }

  Widget _stateView({
    required IconData icon,
    required String title,
    required String message,
    required String actionLabel,
    required VoidCallback onAction,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: _accent, size: 42),
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: _text,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: _muted, height: 1.45),
            ),
            const SizedBox(height: 18),
            ElevatedButton(
              onPressed: onAction,
              style: ElevatedButton.styleFrom(
                backgroundColor: _accent,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: Text(actionLabel),
            ),
          ],
        ),
      ),
    );
  }

  Widget _heroChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.16),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: Colors.white70,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 14,
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  int _totalPages(int itemCount) {
    return itemCount == 0 ? 1 : (itemCount / _medicationsPerPage).ceil();
  }

  String _doctorName(String value) {
    final name = value.trim();
    if (name.isEmpty || name == '-') {
      return '-';
    }

    return name.toLowerCase().startsWith('dr.') ? name : 'Dr. $name';
  }
}

class _MedicationDetail {
  final String label;
  final String value;

  const _MedicationDetail(this.label, this.value);
}
