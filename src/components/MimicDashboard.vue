<script setup>
import * as d3 from "d3";
import { computed, onMounted, ref, watch } from "vue";
import BarChartCard from "./BarChartCard.vue";

const tabs = [
  { id: "overview", label: "患者概览" },
  { id: "icu", label: "ICU监护" },
  { id: "labs", label: "检验分析" },
  { id: "meds", label: "用药分析" }
];

const activeTab = ref("overview");
const loading = ref(true);
const errorMessage = ref("");
const selectedSubjectId = ref("");
const patientSearch = ref("");
const linkedPatientMode = ref(false);
const datasets = ref({
  patients: [],
  admissions: [],
  icustays: [],
  labevents: [],
  labitems: [],
  prescriptions: [],
  inputCv: [],
  inputMv: [],
  outputevents: [],
  procedureevents: [],
  items: [],
  diagnoses: [],
  diagnosisDict: []
});

const dataRoot = `${import.meta.env.BASE_URL}data/mimic-iii-clinical-database-demo-1.4`;

function parseDate(value) {
  return value ? new Date(value) : null;
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeLabel(value, fallback = "Unknown") {
  return value && `${value}`.trim() ? `${value}`.trim() : fallback;
}

function topEntries(values, limit = 8) {
  return [...values].sort((a, b) => b.value - a.value).slice(0, limit);
}

function groupCount(rows, accessor, limit = 8) {
  const counts = d3.rollups(
    rows,
    (group) => group.length,
    (item) => normalizeLabel(accessor(item))
  );

  return topEntries(
    counts.map(([label, value]) => ({ label, value })),
    limit
  );
}

function formatDate(value) {
  if (!value) {
    return "未知";
  }

  return d3.timeFormat("%Y-%m-%d")(value);
}

function formatDays(value) {
  return `${d3.format(".1f")(value)} 天`;
}

function selectPatient(subjectId) {
  selectedSubjectId.value = subjectId;
  linkedPatientMode.value = true;
}

function clearLinkedPatientMode() {
  linkedPatientMode.value = false;
}

async function fetchCsv(path, parser) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`数据请求失败: ${response.status} ${path}`);
  }

  return d3.csvParse(await response.text(), parser);
}

async function loadAllData() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [
      patients,
      admissions,
      icustays,
      labevents,
      labitems,
      prescriptions,
      inputCv,
      inputMv,
      outputevents,
      procedureevents,
      items,
      diagnoses,
      diagnosisDict
    ] = await Promise.all([
      fetchCsv(`${dataRoot}/PATIENTS.csv`, (row) => ({
        subject_id: row.subject_id,
        gender: normalizeLabel(row.gender),
        dob: parseDate(row.dob),
        dod: parseDate(row.dod),
        expire_flag: row.expire_flag === "1"
      })),
      fetchCsv(`${dataRoot}/ADMISSIONS.csv`, (row) => ({
        subject_id: row.subject_id,
        hadm_id: row.hadm_id,
        admittime: parseDate(row.admittime),
        dischtime: parseDate(row.dischtime),
        admission_type: normalizeLabel(row.admission_type),
        ethnicity: normalizeLabel(row.ethnicity),
        insurance: normalizeLabel(row.insurance),
        hospital_expire_flag: row.hospital_expire_flag === "1"
      })),
      fetchCsv(`${dataRoot}/ICUSTAYS.csv`, (row) => ({
        subject_id: row.subject_id,
        hadm_id: row.hadm_id,
        icustay_id: row.icustay_id,
        first_careunit: normalizeLabel(row.first_careunit),
        los: toNumber(row.los) ?? 0
      })),
      fetchCsv(`${dataRoot}/LABEVENTS.csv`, (row) => ({
        subject_id: row.subject_id,
        hadm_id: row.hadm_id,
        itemid: row.itemid,
        flag: normalizeLabel(row.flag, "")
      })),
      fetchCsv(`${dataRoot}/D_LABITEMS.csv`, (row) => ({
        itemid: row.itemid,
        label: normalizeLabel(row.label),
        category: normalizeLabel(row.category),
        fluid: normalizeLabel(row.fluid)
      })),
      fetchCsv(`${dataRoot}/PRESCRIPTIONS.csv`, (row) => ({
        subject_id: row.subject_id,
        hadm_id: row.hadm_id,
        drug: normalizeLabel(row.drug),
        drug_type: normalizeLabel(row.drug_type),
        route: normalizeLabel(row.route)
      })),
      fetchCsv(`${dataRoot}/INPUTEVENTS_CV.csv`, (row) => ({
        icustay_id: row.icustay_id,
        itemid: row.itemid,
        amount: toNumber(row.amount) ?? 0
      })),
      fetchCsv(`${dataRoot}/INPUTEVENTS_MV.csv`, (row) => ({
        icustay_id: row.icustay_id,
        itemid: row.itemid,
        amount: toNumber(row.amount) ?? 0
      })),
      fetchCsv(`${dataRoot}/OUTPUTEVENTS.csv`, (row) => ({
        icustay_id: row.icustay_id,
        itemid: row.itemid,
        value: toNumber(row.value) ?? 0
      })),
      fetchCsv(`${dataRoot}/PROCEDUREEVENTS_MV.csv`, (row) => ({
        icustay_id: row.icustay_id,
        itemid: row.itemid
      })),
      fetchCsv(`${dataRoot}/D_ITEMS.csv`, (row) => ({
        itemid: row.itemid,
        label: normalizeLabel(row.label)
      })),
      fetchCsv(`${dataRoot}/DIAGNOSES_ICD.csv`, (row) => ({
        subject_id: row.subject_id,
        hadm_id: row.hadm_id,
        seq_num: toNumber(row.seq_num) ?? 0,
        icd9_code: row.icd9_code
      })),
      fetchCsv(`${dataRoot}/D_ICD_DIAGNOSES.csv`, (row) => ({
        icd9_code: row.icd9_code,
        short_title: normalizeLabel(row.short_title),
        long_title: normalizeLabel(row.long_title)
      }))
    ]);

    datasets.value = {
      patients,
      admissions,
      icustays,
      labevents,
      labitems,
      prescriptions,
      inputCv,
      inputMv,
      outputevents,
      procedureevents,
      items,
      diagnoses,
      diagnosisDict
    };
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "数据加载失败";
  } finally {
    loading.value = false;
  }
}

onMounted(loadAllData);

const itemLabelMap = computed(
  () => new Map(datasets.value.items.map((item) => [item.itemid, item.label]))
);

const labItemMap = computed(
  () =>
    new Map(
      datasets.value.labitems.map((item) => [
        item.itemid,
        { label: item.label, category: item.category, fluid: item.fluid }
      ])
    )
);

const diagnosisMap = computed(
  () =>
    new Map(
      datasets.value.diagnosisDict.map((item) => [
        item.icd9_code,
        item.long_title || item.short_title
      ])
    )
);

const patientSummaries = computed(() => {
  const admissionBySubject = d3.group(datasets.value.admissions, (item) => item.subject_id);
  const icuBySubject = d3.group(datasets.value.icustays, (item) => item.subject_id);
  const labsBySubject = d3.group(datasets.value.labevents, (item) => item.subject_id);
  const rxBySubject = d3.group(datasets.value.prescriptions, (item) => item.subject_id);
  const dxBySubject = d3.group(datasets.value.diagnoses, (item) => item.subject_id);

  return datasets.value.patients
    .map((patient) => {
      const admissions = admissionBySubject.get(patient.subject_id) ?? [];
      const icustays = icuBySubject.get(patient.subject_id) ?? [];
      const labevents = labsBySubject.get(patient.subject_id) ?? [];
      const prescriptions = rxBySubject.get(patient.subject_id) ?? [];
      const diagnoses = dxBySubject.get(patient.subject_id) ?? [];
      const firstAdmission = admissions
        .map((item) => item.admittime)
        .filter(Boolean)
        .sort((a, b) => a - b)[0];
      const age =
        patient.dob && firstAdmission
          ? Math.max(
              0,
              Math.floor((firstAdmission - patient.dob) / (365.2425 * 24 * 60 * 60 * 1000))
            )
          : null;
      const primaryDiagnosis = [...diagnoses]
        .sort((a, b) => a.seq_num - b.seq_num)
        .map((item) => diagnosisMap.value.get(item.icd9_code))
        .find(Boolean);
      const abnormalLabs = labevents.filter((item) => item.flag).length;

      return {
        ...patient,
        admissions,
        icustays,
        labevents,
        prescriptions,
        diagnoses,
        age,
        primaryDiagnosis: primaryDiagnosis ?? "暂无诊断说明",
        admissionCount: admissions.length,
        icuCount: icustays.length,
        abnormalLabCount: abnormalLabs,
        medCount: prescriptions.length,
        mortality: patient.expire_flag || admissions.some((item) => item.hospital_expire_flag)
      };
    })
    .sort((a, b) => {
      if (b.admissionCount !== a.admissionCount) {
        return b.admissionCount - a.admissionCount;
      }

      return a.subject_id.localeCompare(b.subject_id);
    });
});

watch(
  patientSummaries,
  (list) => {
    if (!list.length) {
      selectedSubjectId.value = "";
      return;
    }

    if (!list.some((item) => item.subject_id === selectedSubjectId.value)) {
      selectedSubjectId.value = list[0].subject_id;
    }
  },
  { immediate: true }
);

const filteredPatients = computed(() => {
  const keyword = patientSearch.value.trim().toLowerCase();

  if (!keyword) {
    return patientSummaries.value.slice(0, 12);
  }

  return patientSummaries.value
    .filter((patient) => {
      const haystack = [
        patient.subject_id,
        patient.gender,
        patient.primaryDiagnosis,
        patient.admissions[0]?.ethnicity,
        patient.admissions[0]?.insurance
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    })
    .slice(0, 12);
});

const selectedPatient = computed(
  () =>
    patientSummaries.value.find((item) => item.subject_id === selectedSubjectId.value) ??
    patientSummaries.value[0] ??
    null
);

const activeLinkedPatient = computed(() =>
  linkedPatientMode.value ? selectedPatient.value : null
);

const linkedIcuRows = computed(() => {
  const patient = activeLinkedPatient.value;

  if (!patient) {
    return datasets.value.icustays;
  }

  return patient.icustays;
});

const linkedIcuStayIds = computed(() => new Set(linkedIcuRows.value.map((item) => item.icustay_id)));

const linkedInputCvRows = computed(() => {
  if (!activeLinkedPatient.value) {
    return datasets.value.inputCv;
  }

  return datasets.value.inputCv.filter((item) => linkedIcuStayIds.value.has(item.icustay_id));
});

const linkedInputMvRows = computed(() => {
  if (!activeLinkedPatient.value) {
    return datasets.value.inputMv;
  }

  return datasets.value.inputMv.filter((item) => linkedIcuStayIds.value.has(item.icustay_id));
});

const linkedOutputRows = computed(() => {
  if (!activeLinkedPatient.value) {
    return datasets.value.outputevents;
  }

  return datasets.value.outputevents.filter((item) => linkedIcuStayIds.value.has(item.icustay_id));
});

const linkedProcedureRows = computed(() => {
  if (!activeLinkedPatient.value) {
    return datasets.value.procedureevents;
  }

  return datasets.value.procedureevents.filter((item) => linkedIcuStayIds.value.has(item.icustay_id));
});

const linkedLabRows = computed(() =>
  activeLinkedPatient.value ? activeLinkedPatient.value.labevents : datasets.value.labevents
);

const linkedPrescriptionRows = computed(() =>
  activeLinkedPatient.value ? activeLinkedPatient.value.prescriptions : datasets.value.prescriptions
);

const overviewStats = computed(() => {
  const { patients, admissions, icustays } = datasets.value;
  const mortality =
    admissions.length === 0
      ? 0
      : (admissions.filter((item) => item.hospital_expire_flag).length /
          admissions.length) *
        100;

  return [
    { label: "患者数", value: patients.length, tone: "teal" },
    { label: "住院记录", value: admissions.length, tone: "amber" },
    { label: "ICU停留", value: icustays.length, tone: "slate" },
    { label: "院内死亡率", value: `${d3.format(".1f")(mortality)}%`, tone: "coral" }
  ];
});

const ageBands = computed(() => {
  const buckets = new Map([
    ["18-29", 0],
    ["30-44", 0],
    ["45-59", 0],
    ["60-74", 0],
    ["75-89", 0],
    ["90+", 0]
  ]);

  for (const patient of patientSummaries.value) {
    if (patient.age == null) {
      continue;
    }

    if (patient.age < 30) buckets.set("18-29", buckets.get("18-29") + 1);
    else if (patient.age < 45) buckets.set("30-44", buckets.get("30-44") + 1);
    else if (patient.age < 60) buckets.set("45-59", buckets.get("45-59") + 1);
    else if (patient.age < 75) buckets.set("60-74", buckets.get("60-74") + 1);
    else if (patient.age < 90) buckets.set("75-89", buckets.get("75-89") + 1);
    else buckets.set("90+", buckets.get("90+") + 1);
  }

  return Array.from(buckets, ([label, value]) => ({ label, value }));
});

const genderDistribution = computed(() =>
  groupCount(datasets.value.patients, (item) => item.gender, 4)
);

const admissionTypeDistribution = computed(() =>
  groupCount(datasets.value.admissions, (item) => item.admission_type)
);

const associationByGender = computed(() => {
  const rows = d3.rollups(
    patientSummaries.value,
    (group) => {
      const icuRate = group.length
        ? (group.filter((item) => item.icuCount > 0).length / group.length) * 100
        : 0;
      return Number(icuRate.toFixed(1));
    },
    (item) => item.gender
  );

  return rows.map(([label, value]) => ({ label, value }));
});

const associationByAdmissionType = computed(() => {
  const rows = d3.rollups(
    datasets.value.admissions,
    (group) =>
      group.length
        ? Number(
            (
              (group.filter((item) => item.hospital_expire_flag).length / group.length) *
              100
            ).toFixed(1)
          )
        : 0,
    (item) => item.admission_type
  );

  return topEntries(rows.map(([label, value]) => ({ label, value })));
});

const selectedPatientProfile = computed(() => {
  const patient = selectedPatient.value;

  if (!patient) {
    return null;
  }

  const admissions = [...patient.admissions].sort(
    (a, b) => (a.admittime?.getTime() ?? 0) - (b.admittime?.getTime() ?? 0)
  );
  const icuByHadm = d3.group(patient.icustays, (item) => item.hadm_id);
  const labsByHadm = d3.group(patient.labevents, (item) => item.hadm_id);
  const medsByHadm = d3.group(patient.prescriptions, (item) => item.hadm_id);
  const dxByHadm = d3.group(patient.diagnoses, (item) => item.hadm_id);

  const timeline = admissions.map((admission) => {
    const icuStays = icuByHadm.get(admission.hadm_id) ?? [];
    const labs = labsByHadm.get(admission.hadm_id) ?? [];
    const meds = medsByHadm.get(admission.hadm_id) ?? [];
    const diagnoses = (dxByHadm.get(admission.hadm_id) ?? [])
      .sort((a, b) => a.seq_num - b.seq_num)
      .map((item) => diagnosisMap.value.get(item.icd9_code) ?? item.icd9_code)
      .slice(0, 3);

    return {
      hadm_id: admission.hadm_id,
      admission_type: admission.admission_type,
      admittime: formatDate(admission.admittime),
      dischtime: formatDate(admission.dischtime),
      ethnicity: admission.ethnicity,
      insurance: admission.insurance,
      expired: admission.hospital_expire_flag,
      icuCount: icuStays.length,
      avgIcuLos: icuStays.length ? d3.mean(icuStays, (item) => item.los) ?? 0 : 0,
      abnormalLabs: labs.filter((item) => item.flag).length,
      medCount: meds.length,
      diagnoses
    };
  });

  const topLabs = topEntries(
    d3
      .rollups(
        patient.labevents,
        (group) => group.length,
        (item) => labItemMap.value.get(item.itemid)?.label ?? `Item ${item.itemid}`
      )
      .map(([label, value]) => ({ label, value })),
    5
  );

  const topMeds = topEntries(
    d3
      .rollups(
        patient.prescriptions,
        (group) => group.length,
        (item) => item.drug
      )
      .map(([label, value]) => ({ label, value })),
    5
  );

  const diagnoses = topEntries(
    d3
      .rollups(
        patient.diagnoses,
        (group) => group.length,
        (item) => diagnosisMap.value.get(item.icd9_code) ?? item.icd9_code
      )
      .map(([label, value]) => ({ label, value })),
    5
  );

  return {
    patient,
    timeline,
    topLabs,
    topMeds,
    diagnoses,
    abnormalRate: patient.labevents.length
      ? (patient.labevents.filter((item) => item.flag).length / patient.labevents.length) * 100
      : 0,
    careunits: groupCount(patient.icustays, (item) => item.first_careunit, 5)
  };
});

const avgIcuLos = computed(() =>
  linkedIcuRows.value.length
    ? d3.mean(linkedIcuRows.value, (item) => item.los) ?? 0
    : 0
);

const icuStats = computed(() => {
  const totalInputs = linkedInputCvRows.value.length + linkedInputMvRows.value.length;
  const totalOutputs = linkedOutputRows.value.length;
  const totalProcedures = linkedProcedureRows.value.length;

  return [
    { label: "平均ICU天数", value: `${d3.format(".1f")(avgIcuLos.value)} 天`, tone: "teal" },
    { label: "输入事件", value: d3.format(",")(totalInputs), tone: "amber" },
    { label: "输出事件", value: d3.format(",")(totalOutputs), tone: "slate" },
    { label: "操作事件", value: d3.format(",")(totalProcedures), tone: "coral" }
  ];
});

const icuUnitDistribution = computed(() =>
  groupCount(linkedIcuRows.value, (item) => item.first_careunit)
);

const icuProcedureDistribution = computed(() => {
  const counts = d3.rollups(
    linkedProcedureRows.value,
    (group) => group.length,
    (item) => normalizeLabel(itemLabelMap.value.get(item.itemid))
  );

  return topEntries(counts.map(([label, value]) => ({ label, value })));
});

const fluidByStay = computed(() => {
  const inputTotals = new Map();
  const outputTotals = new Map();

  for (const row of [...linkedInputCvRows.value, ...linkedInputMvRows.value]) {
    inputTotals.set(row.icustay_id, (inputTotals.get(row.icustay_id) ?? 0) + row.amount);
  }

  for (const row of linkedOutputRows.value) {
    outputTotals.set(row.icustay_id, (outputTotals.get(row.icustay_id) ?? 0) + row.value);
  }

  const balances = linkedIcuRows.value
    .map((stay) => ({
      label: stay.icustay_id,
      value: (inputTotals.get(stay.icustay_id) ?? 0) - (outputTotals.get(stay.icustay_id) ?? 0)
    }))
    .filter((item) => item.value > 0);

  return topEntries(balances, 8);
});

const labStats = computed(() => {
  const labRows = linkedLabRows.value;
  const abnormalCount = labRows.filter((item) => item.flag).length;
  const abnormalRate = labRows.length ? (abnormalCount / labRows.length) * 100 : 0;

  return [
    { label: "检验记录", value: d3.format(",")(labRows.length), tone: "teal" },
    { label: "检验项目数", value: datasets.value.labitems.length, tone: "amber" },
    { label: "异常标记率", value: `${d3.format(".1f")(abnormalRate)}%`, tone: "coral" },
    {
      label: "样本类型数",
      value: new Set(datasets.value.labitems.map((item) => item.fluid)).size,
      tone: "slate"
    }
  ];
});

const topLabTests = computed(() => {
  const counts = d3.rollups(
    linkedLabRows.value,
    (group) => group.length,
    (item) => labItemMap.value.get(item.itemid)?.label ?? `Item ${item.itemid}`
  );

  return topEntries(counts.map(([label, value]) => ({ label, value })));
});

const topAbnormalLabs = computed(() => {
  const flagged = linkedLabRows.value.filter((item) => item.flag);
  const counts = d3.rollups(
    flagged,
    (group) => group.length,
    (item) => labItemMap.value.get(item.itemid)?.label ?? `Item ${item.itemid}`
  );

  return topEntries(counts.map(([label, value]) => ({ label, value })));
});

const labCategoryDistribution = computed(() =>
  groupCount(datasets.value.labitems, (item) => item.category)
);

const medStats = computed(() => {
  const uniqueDrugs = new Set(linkedPrescriptionRows.value.map((item) => item.drug));
  const uniqueRoutes = new Set(linkedPrescriptionRows.value.map((item) => item.route));

  return [
    {
      label: "处方记录",
      value: d3.format(",")(linkedPrescriptionRows.value.length),
      tone: "teal"
    },
    { label: "药物种类", value: uniqueDrugs.size, tone: "amber" },
    { label: "给药途径", value: uniqueRoutes.size, tone: "slate" },
    {
      label: "住院覆盖",
      value: new Set(linkedPrescriptionRows.value.map((item) => item.hadm_id)).size,
      tone: "coral"
    }
  ];
});

const topDrugs = computed(() =>
  groupCount(linkedPrescriptionRows.value, (item) => item.drug)
);

const routeDistribution = computed(() =>
  groupCount(linkedPrescriptionRows.value, (item) => item.route)
);

const drugTypeDistribution = computed(() =>
  groupCount(linkedPrescriptionRows.value, (item) => item.drug_type)
);
</script>

<template>
  <section class="dashboard panel">
    <div class="panel-header dashboard-head">
      <div>
        <h2>MIMIC-III 多视角探索</h2>
        <p>通过 tab 切换查看患者画像、ICU 过程、实验室检验与用药结构。</p>
      </div>
      <button class="reload-button" type="button" @click="loadAllData">
        重新加载
      </button>
    </div>

    <div class="tab-strip" role="tablist" aria-label="临床分析视图">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-button"
        :class="{ active: tab.id === activeTab }"
        type="button"
        role="tab"
        :aria-selected="tab.id === activeTab"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeLinkedPatient" class="linked-banner">
      <div>
        <strong>当前已联动患者视角：</strong>
        Subject {{ activeLinkedPatient.subject_id }} ·
        {{ activeLinkedPatient.primaryDiagnosis }}
      </div>
      <button class="ghost-button" type="button" @click="clearLinkedPatientMode">
        返回全量数据
      </button>
    </div>

    <div v-if="loading" class="feedback">正在加载 MIMIC-III demo 数据...</div>
    <div v-else-if="errorMessage" class="feedback error">{{ errorMessage }}</div>

    <template v-else>
      <section v-if="activeTab === 'overview'" class="dashboard-tab">
        <div class="stats">
          <article
            v-for="stat in overviewStats"
            :key="stat.label"
            class="stat-card"
            :data-tone="stat.tone"
          >
            <span>{{ stat.label }}</span>
            <strong>{{ stat.value }}</strong>
          </article>
        </div>

        <div class="viz-grid overview-grid">
          <BarChartCard title="年龄分层" description="按首次住院时间估算患者年龄段" :data="ageBands" color="#0f766e" />
          <BarChartCard title="性别分布" description="患者主表中的性别结构" :data="genderDistribution" color="#f59e0b" />
          <BarChartCard title="入院类型" description="住院主表中的 admission type" :data="admissionTypeDistribution" color="#0f172a" />
          <BarChartCard title="性别与 ICU 入住率" description="患者维度的 ICU 进入比例" :data="associationByGender" color="#2563eb" percentage />
          <BarChartCard title="入院类型与院内死亡率" description="不同 admission type 的住院死亡率" :data="associationByAdmissionType" color="#dc2626" percentage />
        </div>

        <section class="patient-drilldown">
          <div class="patient-column">
            <div class="patient-search-card">
              <div>
                <h3>患者列表</h3>
                <p>点击任一患者，查看更细粒度的单人画像与关联摘要。</p>
              </div>
              <input v-model="patientSearch" class="patient-search" type="search" placeholder="搜索 subject_id / 诊断 / 保险" />
            </div>

            <div class="patient-list">
              <button
                v-for="patient in filteredPatients"
                :key="patient.subject_id"
                class="patient-list-item"
                :class="{ active: patient.subject_id === selectedPatient?.subject_id }"
                type="button"
                @click="selectPatient(patient.subject_id)"
              >
                <div class="patient-list-head">
                  <strong>患者 {{ patient.subject_id }}</strong>
                  <span>{{ patient.gender }} · {{ patient.age ?? "未知" }} 岁</span>
                </div>
                <p>{{ patient.primaryDiagnosis }}</p>
                <div class="patient-mini-stats">
                  <span>{{ patient.admissionCount }} 次住院</span>
                  <span>{{ patient.icuCount }} 次 ICU</span>
                  <span>{{ patient.abnormalLabCount }} 条异常检验</span>
                </div>
              </button>
            </div>
          </div>

          <div v-if="selectedPatientProfile" class="detail-column">
            <section class="detail-hero">
              <div>
                <p class="detail-kicker">患者画像</p>
                <h3>Subject {{ selectedPatientProfile.patient.subject_id }}</h3>
                <p class="detail-summary">{{ selectedPatientProfile.patient.primaryDiagnosis }}</p>
              </div>
              <div class="detail-flags">
                <span>{{ selectedPatientProfile.patient.gender }}</span>
                <span>{{ selectedPatientProfile.patient.age ?? "未知" }} 岁</span>
                <span>{{ selectedPatientProfile.patient.mortality ? "死亡结局" : "存活结局" }}</span>
              </div>
            </section>

            <div class="detail-stat-grid">
              <article class="detail-stat"><span>住院次数</span><strong>{{ selectedPatientProfile.patient.admissionCount }}</strong></article>
              <article class="detail-stat"><span>ICU 次数</span><strong>{{ selectedPatientProfile.patient.icuCount }}</strong></article>
              <article class="detail-stat"><span>异常检验率</span><strong>{{ d3.format(".1f")(selectedPatientProfile.abnormalRate) }}%</strong></article>
              <article class="detail-stat"><span>处方记录</span><strong>{{ selectedPatientProfile.patient.medCount }}</strong></article>
            </div>

            <div class="detail-grid">
              <article class="detail-card detail-card-wide">
                <h4>住院与 ICU 时间线</h4>
                <div class="timeline-list">
                  <div v-for="stay in selectedPatientProfile.timeline" :key="stay.hadm_id" class="timeline-item">
                    <div class="timeline-marker"></div>
                    <div>
                      <strong>{{ stay.admission_type }} · HADM {{ stay.hadm_id }}</strong>
                      <p>{{ stay.admittime }} 至 {{ stay.dischtime }}</p>
                      <p>{{ stay.ethnicity }} / {{ stay.insurance }} / {{ stay.icuCount }} 次 ICU / 平均 ICU {{ formatDays(stay.avgIcuLos) }}</p>
                      <p>{{ stay.abnormalLabs }} 条异常检验 · {{ stay.medCount }} 条处方<span v-if="stay.expired"> · 本次住院死亡</span></p>
                      <p v-if="stay.diagnoses.length">诊断：{{ stay.diagnoses.join(" / ") }}</p>
                    </div>
                  </div>
                </div>
              </article>

              <article class="detail-card">
                <h4>关联摘要</h4>
                <div class="association-stack">
                  <div><span>主要诊断簇</span><p>{{ selectedPatientProfile.diagnoses.map((item) => item.label).join(" / ") || "暂无" }}</p></div>
                  <div><span>高频检验项目</span><p>{{ selectedPatientProfile.topLabs.map((item) => item.label).join(" / ") || "暂无" }}</p></div>
                  <div><span>高频用药</span><p>{{ selectedPatientProfile.topMeds.map((item) => item.label).join(" / ") || "暂无" }}</p></div>
                  <div><span>主要 ICU 病区</span><p>{{ selectedPatientProfile.careunits.map((item) => item.label).join(" / ") || "暂无 ICU 记录" }}</p></div>
                </div>
              </article>

              <BarChartCard title="患者诊断画像" description="按 ICD 诊断说明聚合" :data="selectedPatientProfile.diagnoses" color="#0f766e" />
              <BarChartCard title="患者高频检验" description="按检验项目出现次数聚合" :data="selectedPatientProfile.topLabs" color="#7c3aed" />
              <BarChartCard title="患者高频用药" description="按药物处方次数聚合" :data="selectedPatientProfile.topMeds" color="#f97316" />
            </div>
          </div>
        </section>
      </section>

      <section v-else-if="activeTab === 'icu'" class="dashboard-tab">
        <div v-if="activeLinkedPatient" class="scope-note">
          当前展示的是患者 {{ activeLinkedPatient.subject_id }} 的 ICU 数据。
        </div>
        <div class="stats">
          <article v-for="stat in icuStats" :key="stat.label" class="stat-card" :data-tone="stat.tone">
            <span>{{ stat.label }}</span>
            <strong>{{ stat.value }}</strong>
          </article>
        </div>

        <div class="viz-grid">
          <BarChartCard title="ICU病区分布" description="首次 ICU care unit 的分布" :data="icuUnitDistribution" color="#0f766e" />
          <BarChartCard title="常见 ICU 操作" description="Procedure events 按项目标签聚合" :data="icuProcedureDistribution" color="#fb7185" />
          <BarChartCard title="净输入量最高的 ICU 停留" description="基于输入事件减去输出事件的简单聚合" :data="fluidByStay" color="#2563eb" value-suffix=" mL" />
        </div>
      </section>

      <section v-else-if="activeTab === 'labs'" class="dashboard-tab">
        <div v-if="activeLinkedPatient" class="scope-note">
          当前展示的是患者 {{ activeLinkedPatient.subject_id }} 的检验数据。
        </div>
        <div class="stats">
          <article v-for="stat in labStats" :key="stat.label" class="stat-card" :data-tone="stat.tone">
            <span>{{ stat.label }}</span>
            <strong>{{ stat.value }}</strong>
          </article>
        </div>

        <div class="viz-grid">
          <BarChartCard title="检验项目热度" description="出现次数最多的实验室检验" :data="topLabTests" color="#0f766e" />
          <BarChartCard title="异常检验项目" description="带 flag 标记的检验记录聚合" :data="topAbnormalLabs" color="#dc2626" />
          <BarChartCard title="检验类别分布" description="来自 D_LABITEMS 的 category" :data="labCategoryDistribution" color="#7c3aed" />
        </div>
      </section>

      <section v-else class="dashboard-tab">
        <div v-if="activeLinkedPatient" class="scope-note">
          当前展示的是患者 {{ activeLinkedPatient.subject_id }} 的用药数据。
        </div>
        <div class="stats">
          <article v-for="stat in medStats" :key="stat.label" class="stat-card" :data-tone="stat.tone">
            <span>{{ stat.label }}</span>
            <strong>{{ stat.value }}</strong>
          </article>
        </div>

        <div class="viz-grid">
          <BarChartCard title="高频药物" description="按 drug 字段统计的处方频次" :data="topDrugs" color="#0f766e" />
          <BarChartCard title="给药途径分布" description="如口服、静脉、皮下等 route 结构" :data="routeDistribution" color="#f97316" />
          <BarChartCard title="处方类型分布" description="PRESCRIPTIONS 中的 drug_type 字段" :data="drugTypeDistribution" color="#1d4ed8" />
        </div>
      </section>
    </template>
  </section>
</template>
