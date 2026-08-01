--
-- PostgreSQL database dump
--

\restrict bmnBUDCBlrA0Hy2vlXX4skMqZzHRV6EyUDQ3JJSnTvIuqLIYMhLhlZkGm8llBns

-- Dumped from database version 16.2
-- Dumped by pg_dump version 16.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: BridgePageType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BridgePageType" AS ENUM (
    'POGO',
    'ADVERTORIAL',
    'QUIZ_FUNNEL',
    'LEAD_GEN_PAGE',
    'INTERSTITIAL',
    'OTHER'
);


ALTER TYPE public."BridgePageType" OWNER TO postgres;

--
-- Name: SalesPageType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SalesPageType" AS ENUM (
    'VSL',
    'DIRECT',
    'QUIZ',
    'LEAD_GEN',
    'OTHER'
);


ALTER TYPE public."SalesPageType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


ALTER TABLE public."Account" OWNER TO postgres;

--
-- Name: AgentRun; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AgentRun" (
    id text NOT NULL,
    "userId" text NOT NULL,
    agent text NOT NULL,
    provider text DEFAULT ''::text NOT NULL,
    model text DEFAULT ''::text NOT NULL,
    "promptTokens" integer DEFAULT 0 NOT NULL,
    "completionTokens" integer DEFAULT 0 NOT NULL,
    "totalTokens" integer DEFAULT 0 NOT NULL,
    "costUsd" double precision DEFAULT 0 NOT NULL,
    "keySource" text DEFAULT 'platform'::text NOT NULL,
    "durationMs" integer DEFAULT 0 NOT NULL,
    success boolean DEFAULT true NOT NULL,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AgentRun" OWNER TO postgres;

--
-- Name: AtpSearch; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AtpSearch" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "campaignId" text,
    keyword text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    region text DEFAULT 'us'::text NOT NULL,
    provider text DEFAULT 'gweb'::text NOT NULL,
    "parentSearchId" text,
    "searchId" text,
    status text DEFAULT 'loading'::text NOT NULL,
    "creditCharged" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AtpSearch" OWNER TO postgres;

--
-- Name: BridgePageStrategyRecommendation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."BridgePageStrategyRecommendation" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "campaignId" text,
    "recommendedType" public."BridgePageType" NOT NULL,
    reasoning text NOT NULL,
    "confidenceScore" double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BridgePageStrategyRecommendation" OWNER TO postgres;

--
-- Name: Campaign; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Campaign" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "productResearchId" text,
    name text NOT NULL,
    platform text NOT NULL,
    vertical text NOT NULL,
    geo text NOT NULL,
    channel text NOT NULL,
    funnel text DEFAULT 'BRIDGE'::text NOT NULL,
    status text DEFAULT 'EM_TESTE'::text NOT NULL,
    "offerUrl" text,
    commission double precision DEFAULT 0 NOT NULL,
    "refundPct" double precision DEFAULT 0 NOT NULL,
    aov double precision DEFAULT 0 NOT NULL,
    "cvrExpected" double precision DEFAULT 1.0 NOT NULL,
    "commissionNet" double precision DEFAULT 0 NOT NULL,
    "epcBreakeven" double precision DEFAULT 0 NOT NULL,
    "cpcMax" double precision DEFAULT 0 NOT NULL,
    "cpcScale" double precision DEFAULT 0 NOT NULL,
    "presellUrl" text,
    "flowpageUrl" text,
    "hostingerDomain" text,
    "budgetTest" double precision DEFAULT 50 NOT NULL,
    "budgetDaily" double precision DEFAULT 0 NOT NULL,
    "testDuration" text DEFAULT '72h'::text NOT NULL,
    "budgetScale" double precision DEFAULT 0 NOT NULL,
    "campaignNameGenerated" text,
    "utmString" text,
    "googleCampaignName" text,
    "googleCampaignId" text,
    "googleAdGroupId" text,
    "campaignType" text,
    "bidStrategy" text,
    "utmCampaign" text,
    "qualityScoreNotes" text,
    "postbackUrl" text,
    "clickidToken" text,
    "presellHtml" text,
    "wizardStep" integer DEFAULT 1 NOT NULL,
    "wizardCompleted" boolean DEFAULT false NOT NULL,
    "loopEnabled" boolean DEFAULT false NOT NULL,
    "loopInterval" text DEFAULT '24h'::text NOT NULL,
    "loopAgents" text DEFAULT 'ads,compliance'::text NOT NULL,
    "lastLoopRunAt" timestamp(3) without time zone,
    "launchedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "baseCampaignId" text,
    "experimentId" text,
    "experimentStatus" text,
    "experimentTrafficSplit" integer DEFAULT 50 NOT NULL,
    "experimentVariationType" text,
    "experimentVariationValue" text,
    "googleTrialCampaignId" text,
    "isExperiment" boolean DEFAULT false NOT NULL,
    "pageType" text DEFAULT 'advertorial'::text NOT NULL,
    "popupGate" boolean DEFAULT false NOT NULL,
    "presellGeneratedAt" timestamp(3) without time zone,
    "videoUrl" text
);


ALTER TABLE public."Campaign" OWNER TO postgres;

--
-- Name: CampaignChecklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CampaignChecklist" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    step integer NOT NULL,
    "itemKey" text NOT NULL,
    "itemLabel" text NOT NULL,
    "isCritical" boolean DEFAULT false NOT NULL,
    "isChecked" boolean DEFAULT false NOT NULL,
    "checkedAt" timestamp(3) without time zone,
    note text,
    "verificationType" text DEFAULT 'self_attested'::text NOT NULL
);


ALTER TABLE public."CampaignChecklist" OWNER TO postgres;

--
-- Name: CampaignDecision; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CampaignDecision" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    "userId" text NOT NULL,
    decision text NOT NULL,
    rationale text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CampaignDecision" OWNER TO postgres;

--
-- Name: ChecklistLearning; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChecklistLearning" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "itemKey" text NOT NULL,
    scope text NOT NULL,
    vertical text,
    channel text,
    platform text,
    "pageType" text,
    problem text NOT NULL,
    correction text NOT NULL,
    "appliesGlobally" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ChecklistLearning" OWNER TO postgres;

--
-- Name: DailyLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DailyLog" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    "userId" text NOT NULL,
    "logDate" timestamp(3) without time zone NOT NULL,
    impressions integer DEFAULT 0 NOT NULL,
    spend double precision DEFAULT 0 NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    hops integer DEFAULT 0 NOT NULL,
    conversions integer DEFAULT 0 NOT NULL,
    revenue double precision DEFAULT 0 NOT NULL,
    refunds double precision DEFAULT 0 NOT NULL,
    network text,
    "offerName" text,
    vertical text,
    geo text,
    channel text,
    funnel text,
    decision text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DailyLog" OWNER TO postgres;

--
-- Name: GoogleAdsExperiment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."GoogleAdsExperiment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "campaignId" text NOT NULL,
    "googleExperimentId" text,
    "resourceName" text,
    name text NOT NULL,
    type text DEFAULT 'SEARCH_CUSTOM'::text NOT NULL,
    status text DEFAULT 'SETUP'::text NOT NULL,
    "syncEnabled" boolean DEFAULT true NOT NULL,
    "trafficAllocationType" text DEFAULT 'SEARCH_CUSTOM'::text NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "variationType" text DEFAULT 'PRESELL_URL'::text NOT NULL,
    "variationConfig" jsonb,
    "budgetRecommendation" jsonb,
    "decisionPolicy" jsonb,
    "lastSyncedAt" timestamp(3) without time zone,
    "lastMetricsAt" timestamp(3) without time zone,
    "lastError" text,
    "idempotencyKey" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GoogleAdsExperiment" OWNER TO postgres;

--
-- Name: GoogleAdsExperimentArm; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."GoogleAdsExperimentArm" (
    id text NOT NULL,
    "experimentId" text NOT NULL,
    name text NOT NULL,
    "isControl" boolean DEFAULT false NOT NULL,
    "trafficSplit" integer NOT NULL,
    "googleArmId" text,
    "resourceName" text,
    "inDesignCampaignResourceName" text,
    "servedCampaignResourceName" text,
    "googleCampaignId" text,
    "localPresellId" text,
    "finalUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."GoogleAdsExperimentArm" OWNER TO postgres;

--
-- Name: GoogleAdsExperimentMetricSnapshot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."GoogleAdsExperimentMetricSnapshot" (
    id text NOT NULL,
    "experimentId" text NOT NULL,
    "snapshotDate" timestamp(3) without time zone NOT NULL,
    "controlImpressions" integer DEFAULT 0 NOT NULL,
    "controlClicks" integer DEFAULT 0 NOT NULL,
    "controlCostMicros" double precision DEFAULT 0 NOT NULL,
    "controlConversions" double precision DEFAULT 0 NOT NULL,
    "controlConversionValue" double precision DEFAULT 0 NOT NULL,
    "treatmentImpressions" integer DEFAULT 0 NOT NULL,
    "treatmentClicks" integer DEFAULT 0 NOT NULL,
    "treatmentCostMicros" double precision DEFAULT 0 NOT NULL,
    "treatmentConversions" double precision DEFAULT 0 NOT NULL,
    "treatmentConversionValue" double precision DEFAULT 0 NOT NULL,
    statistics jsonb,
    "sourcePayload" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."GoogleAdsExperimentMetricSnapshot" OWNER TO postgres;

--
-- Name: GoogleAdsExperimentOperation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."GoogleAdsExperimentOperation" (
    id text NOT NULL,
    "experimentId" text NOT NULL,
    "operationType" text NOT NULL,
    "operationName" text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "errorCode" text,
    "errorMessage" text,
    errors jsonb,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);


ALTER TABLE public."GoogleAdsExperimentOperation" OWNER TO postgres;

--
-- Name: HermesOutboxEntry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."HermesOutboxEntry" (
    id text NOT NULL,
    type text NOT NULL,
    payload jsonb NOT NULL,
    "targetPath" text,
    status text DEFAULT 'pending'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(3) without time zone
);


ALTER TABLE public."HermesOutboxEntry" OWNER TO postgres;

--
-- Name: Integration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Integration" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "serviceName" text NOT NULL,
    "fieldName" text NOT NULL,
    "fieldValue" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Integration" OWNER TO postgres;

--
-- Name: Keyword; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Keyword" (
    id text NOT NULL,
    "campaignId" text,
    "userId" text NOT NULL,
    keyword text NOT NULL,
    layer text DEFAULT 'A'::text NOT NULL,
    "matchType" text DEFAULT 'phrase'::text NOT NULL,
    "cpcEstimate" double precision DEFAULT 0 NOT NULL,
    "relevanceScore" integer DEFAULT 3 NOT NULL,
    "isSelected" boolean DEFAULT false NOT NULL,
    status text DEFAULT 'ativa'::text NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    "cpcReal" double precision DEFAULT 0 NOT NULL,
    conversions integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Keyword" OWNER TO postgres;

--
-- Name: KnowledgeBaseSearch; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."KnowledgeBaseSearch" (
    id text NOT NULL,
    "userId" text NOT NULL,
    query text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."KnowledgeBaseSearch" OWNER TO postgres;

--
-- Name: LoopRun; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LoopRun" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    "userId" text NOT NULL,
    trigger text DEFAULT 'manual'::text NOT NULL,
    decision text DEFAULT 'SEM_DADOS'::text NOT NULL,
    triggers jsonb,
    "agentsRun" jsonb,
    economics jsonb,
    "llmSummary" text,
    "totalTokens" integer DEFAULT 0 NOT NULL,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LoopRun" OWNER TO postgres;

--
-- Name: MarketIntelSnapshot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MarketIntelSnapshot" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "productId" text,
    vertical text NOT NULL,
    query text NOT NULL,
    angles jsonb,
    "pageTypesSeen" jsonb,
    sources jsonb,
    "fetchedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MarketIntelSnapshot" OWNER TO postgres;

--
-- Name: Offer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Offer" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "offerId" text NOT NULL,
    network text NOT NULL,
    name text NOT NULL,
    vertical text NOT NULL,
    "geoAllowed" text DEFAULT 'US'::text NOT NULL,
    "payoutCommission" text DEFAULT ''::text NOT NULL,
    model text DEFAULT 'CPA'::text NOT NULL,
    "gravityEpcRef" text DEFAULT ''::text NOT NULL,
    upsells text DEFAULT 'Não'::text NOT NULL,
    "trademarkBidding" text DEFAULT 'Proibido'::text NOT NULL,
    "googleAllowed" text DEFAULT ''::text NOT NULL,
    "funnelRecommended" text DEFAULT 'Bridge'::text NOT NULL,
    "vendorTermsOk" boolean DEFAULT false NOT NULL,
    "hopLink" text,
    "breakevenCpc" double precision DEFAULT 0 NOT NULL,
    status text DEFAULT 'Teste'::text NOT NULL,
    "testStartDate" timestamp(3) without time zone,
    result text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Offer" OWNER TO postgres;

--
-- Name: Presell; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Presell" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "productId" text,
    slug text NOT NULL,
    title text NOT NULL,
    "productName" text NOT NULL,
    "hopLink" text NOT NULL,
    "trackingId" text DEFAULT ''::text NOT NULL,
    angle text DEFAULT 'review'::text NOT NULL,
    "pageType" text DEFAULT 'advertorial'::text NOT NULL,
    "popupGate" boolean DEFAULT false NOT NULL,
    "videoUrl" text DEFAULT ''::text NOT NULL,
    "variantGroupId" text,
    geo text DEFAULT 'US'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    html text NOT NULL,
    content jsonb,
    status text DEFAULT 'rascunho'::text NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    "ctaClicks" integer DEFAULT 0 NOT NULL,
    "googleAdsId" text DEFAULT ''::text NOT NULL,
    "publishTarget" text DEFAULT 'railway'::text NOT NULL,
    "wpDomain" text DEFAULT ''::text NOT NULL,
    "publishedUrl" text DEFAULT ''::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "campaignId" text,
    "complianceIssues" jsonb,
    "complianceScore" integer,
    "customCode" text DEFAULT ''::text NOT NULL
);


ALTER TABLE public."Presell" OWNER TO postgres;

--
-- Name: ProductResearch; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProductResearch" (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    network text DEFAULT 'clickbank'::text NOT NULL,
    vertical text DEFAULT ''::text NOT NULL,
    gravity double precision,
    "avgPayout" double precision,
    "commissionPct" text DEFAULT ''::text NOT NULL,
    "conversionRate" text DEFAULT ''::text NOT NULL,
    rebill boolean DEFAULT false NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    "riskLevel" text DEFAULT 'medio'::text NOT NULL,
    source text DEFAULT 'ia'::text NOT NULL,
    summary text,
    tags jsonb,
    keywords jsonb,
    strategy jsonb,
    compliance jsonb,
    "hopLink" text,
    "affiliatePageUrl" text,
    "assetsUrl" text,
    "vendorPageUrl" text,
    "affiliateInsights" jsonb,
    status text DEFAULT 'novo'::text NOT NULL,
    "chosenKeyword" text DEFAULT ''::text NOT NULL,
    "salesPageType" public."SalesPageType",
    "avgConversionRate" double precision,
    "avgEpc" double precision,
    "confirmedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductResearch" OWNER TO postgres;

--
-- Name: Session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Session" OWNER TO postgres;

--
-- Name: TestResult; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TestResult" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "testId" text NOT NULL,
    "campaignId" text NOT NULL,
    network text NOT NULL,
    "offerName" text NOT NULL,
    hypothesis text,
    "budgetTest" double precision DEFAULT 0 NOT NULL,
    "minClicks" integer DEFAULT 0 NOT NULL,
    "actualSpend" double precision DEFAULT 0 NOT NULL,
    conversions integer DEFAULT 0 NOT NULL,
    revenue double precision DEFAULT 0 NOT NULL,
    epc double precision DEFAULT 0 NOT NULL,
    "avgCpc" double precision DEFAULT 0 NOT NULL,
    "breakevenCpc" double precision DEFAULT 0 NOT NULL,
    result text DEFAULT 'PENDENTE'::text NOT NULL,
    "nextStep" text,
    learning text,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TestResult" OWNER TO postgres;

--
-- Name: UsagePayment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UsagePayment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    period text NOT NULL,
    "amountUsd" double precision DEFAULT 0 NOT NULL,
    status text DEFAULT 'PENDENTE'::text NOT NULL,
    notes text,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UsagePayment" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text,
    email text NOT NULL,
    "emailVerified" timestamp(3) without time zone,
    image text,
    password text,
    role text DEFAULT 'USER'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "metaReceitaMensal" double precision DEFAULT 0 NOT NULL,
    "metaRoi" double precision DEFAULT 0 NOT NULL,
    "budgetMensalAds" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: VerificationToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VerificationToken" (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VerificationToken" OWNER TO postgres;

--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: AgentRun AgentRun_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AgentRun"
    ADD CONSTRAINT "AgentRun_pkey" PRIMARY KEY (id);


--
-- Name: AtpSearch AtpSearch_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AtpSearch"
    ADD CONSTRAINT "AtpSearch_pkey" PRIMARY KEY (id);


--
-- Name: BridgePageStrategyRecommendation BridgePageStrategyRecommendation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BridgePageStrategyRecommendation"
    ADD CONSTRAINT "BridgePageStrategyRecommendation_pkey" PRIMARY KEY (id);


--
-- Name: CampaignChecklist CampaignChecklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CampaignChecklist"
    ADD CONSTRAINT "CampaignChecklist_pkey" PRIMARY KEY (id);


--
-- Name: CampaignDecision CampaignDecision_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CampaignDecision"
    ADD CONSTRAINT "CampaignDecision_pkey" PRIMARY KEY (id);


--
-- Name: Campaign Campaign_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Campaign"
    ADD CONSTRAINT "Campaign_pkey" PRIMARY KEY (id);


--
-- Name: ChecklistLearning ChecklistLearning_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChecklistLearning"
    ADD CONSTRAINT "ChecklistLearning_pkey" PRIMARY KEY (id);


--
-- Name: DailyLog DailyLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DailyLog"
    ADD CONSTRAINT "DailyLog_pkey" PRIMARY KEY (id);


--
-- Name: GoogleAdsExperimentArm GoogleAdsExperimentArm_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GoogleAdsExperimentArm"
    ADD CONSTRAINT "GoogleAdsExperimentArm_pkey" PRIMARY KEY (id);


--
-- Name: GoogleAdsExperimentMetricSnapshot GoogleAdsExperimentMetricSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GoogleAdsExperimentMetricSnapshot"
    ADD CONSTRAINT "GoogleAdsExperimentMetricSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: GoogleAdsExperimentOperation GoogleAdsExperimentOperation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GoogleAdsExperimentOperation"
    ADD CONSTRAINT "GoogleAdsExperimentOperation_pkey" PRIMARY KEY (id);


--
-- Name: GoogleAdsExperiment GoogleAdsExperiment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GoogleAdsExperiment"
    ADD CONSTRAINT "GoogleAdsExperiment_pkey" PRIMARY KEY (id);


--
-- Name: HermesOutboxEntry HermesOutboxEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."HermesOutboxEntry"
    ADD CONSTRAINT "HermesOutboxEntry_pkey" PRIMARY KEY (id);


--
-- Name: Integration Integration_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Integration"
    ADD CONSTRAINT "Integration_pkey" PRIMARY KEY (id);


--
-- Name: Keyword Keyword_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Keyword"
    ADD CONSTRAINT "Keyword_pkey" PRIMARY KEY (id);


--
-- Name: KnowledgeBaseSearch KnowledgeBaseSearch_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."KnowledgeBaseSearch"
    ADD CONSTRAINT "KnowledgeBaseSearch_pkey" PRIMARY KEY (id);


--
-- Name: LoopRun LoopRun_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LoopRun"
    ADD CONSTRAINT "LoopRun_pkey" PRIMARY KEY (id);


--
-- Name: MarketIntelSnapshot MarketIntelSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MarketIntelSnapshot"
    ADD CONSTRAINT "MarketIntelSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: Offer Offer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Offer"
    ADD CONSTRAINT "Offer_pkey" PRIMARY KEY (id);


--
-- Name: Presell Presell_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Presell"
    ADD CONSTRAINT "Presell_pkey" PRIMARY KEY (id);


--
-- Name: ProductResearch ProductResearch_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductResearch"
    ADD CONSTRAINT "ProductResearch_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: TestResult TestResult_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestResult"
    ADD CONSTRAINT "TestResult_pkey" PRIMARY KEY (id);


--
-- Name: UsagePayment UsagePayment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UsagePayment"
    ADD CONSTRAINT "UsagePayment_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: AgentRun_userId_agent_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AgentRun_userId_agent_idx" ON public."AgentRun" USING btree ("userId", agent);


--
-- Name: AgentRun_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AgentRun_userId_createdAt_idx" ON public."AgentRun" USING btree ("userId", "createdAt");


--
-- Name: AtpSearch_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AtpSearch_campaignId_idx" ON public."AtpSearch" USING btree ("campaignId");


--
-- Name: AtpSearch_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AtpSearch_userId_idx" ON public."AtpSearch" USING btree ("userId");


--
-- Name: BridgePageStrategyRecommendation_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BridgePageStrategyRecommendation_campaignId_idx" ON public."BridgePageStrategyRecommendation" USING btree ("campaignId");


--
-- Name: BridgePageStrategyRecommendation_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BridgePageStrategyRecommendation_productId_idx" ON public."BridgePageStrategyRecommendation" USING btree ("productId");


--
-- Name: CampaignChecklist_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "CampaignChecklist_campaignId_idx" ON public."CampaignChecklist" USING btree ("campaignId");


--
-- Name: CampaignChecklist_campaignId_step_itemKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CampaignChecklist_campaignId_step_itemKey_key" ON public."CampaignChecklist" USING btree ("campaignId", step, "itemKey");


--
-- Name: CampaignDecision_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "CampaignDecision_campaignId_idx" ON public."CampaignDecision" USING btree ("campaignId");


--
-- Name: Campaign_productResearchId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Campaign_productResearchId_idx" ON public."Campaign" USING btree ("productResearchId");


--
-- Name: Campaign_userId_platform_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Campaign_userId_platform_idx" ON public."Campaign" USING btree ("userId", platform);


--
-- Name: Campaign_userId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Campaign_userId_status_idx" ON public."Campaign" USING btree ("userId", status);


--
-- Name: ChecklistLearning_userId_itemKey_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChecklistLearning_userId_itemKey_idx" ON public."ChecklistLearning" USING btree ("userId", "itemKey");


--
-- Name: ChecklistLearning_vertical_channel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChecklistLearning_vertical_channel_idx" ON public."ChecklistLearning" USING btree (vertical, channel);


--
-- Name: DailyLog_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DailyLog_campaignId_idx" ON public."DailyLog" USING btree ("campaignId");


--
-- Name: DailyLog_campaignId_logDate_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DailyLog_campaignId_logDate_key" ON public."DailyLog" USING btree ("campaignId", "logDate");


--
-- Name: DailyLog_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DailyLog_userId_idx" ON public."DailyLog" USING btree ("userId");


--
-- Name: GoogleAdsExperimentArm_experimentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GoogleAdsExperimentArm_experimentId_idx" ON public."GoogleAdsExperimentArm" USING btree ("experimentId");


--
-- Name: GoogleAdsExperimentArm_experimentId_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "GoogleAdsExperimentArm_experimentId_name_key" ON public."GoogleAdsExperimentArm" USING btree ("experimentId", name);


--
-- Name: GoogleAdsExperimentMetricSnapshot_experimentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GoogleAdsExperimentMetricSnapshot_experimentId_idx" ON public."GoogleAdsExperimentMetricSnapshot" USING btree ("experimentId");


--
-- Name: GoogleAdsExperimentMetricSnapshot_experimentId_snapshotDate_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "GoogleAdsExperimentMetricSnapshot_experimentId_snapshotDate_key" ON public."GoogleAdsExperimentMetricSnapshot" USING btree ("experimentId", "snapshotDate");


--
-- Name: GoogleAdsExperimentOperation_experimentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GoogleAdsExperimentOperation_experimentId_idx" ON public."GoogleAdsExperimentOperation" USING btree ("experimentId");


--
-- Name: GoogleAdsExperimentOperation_operationName_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "GoogleAdsExperimentOperation_operationName_key" ON public."GoogleAdsExperimentOperation" USING btree ("operationName");


--
-- Name: GoogleAdsExperimentOperation_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GoogleAdsExperimentOperation_status_idx" ON public."GoogleAdsExperimentOperation" USING btree (status);


--
-- Name: GoogleAdsExperiment_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GoogleAdsExperiment_campaignId_idx" ON public."GoogleAdsExperiment" USING btree ("campaignId");


--
-- Name: GoogleAdsExperiment_userId_googleExperimentId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "GoogleAdsExperiment_userId_googleExperimentId_key" ON public."GoogleAdsExperiment" USING btree ("userId", "googleExperimentId");


--
-- Name: GoogleAdsExperiment_userId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "GoogleAdsExperiment_userId_idempotencyKey_key" ON public."GoogleAdsExperiment" USING btree ("userId", "idempotencyKey");


--
-- Name: GoogleAdsExperiment_userId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GoogleAdsExperiment_userId_status_idx" ON public."GoogleAdsExperiment" USING btree ("userId", status);


--
-- Name: HermesOutboxEntry_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "HermesOutboxEntry_status_idx" ON public."HermesOutboxEntry" USING btree (status);


--
-- Name: Integration_userId_serviceName_fieldName_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Integration_userId_serviceName_fieldName_key" ON public."Integration" USING btree ("userId", "serviceName", "fieldName");


--
-- Name: Integration_userId_serviceName_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Integration_userId_serviceName_idx" ON public."Integration" USING btree ("userId", "serviceName");


--
-- Name: Keyword_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Keyword_campaignId_idx" ON public."Keyword" USING btree ("campaignId");


--
-- Name: Keyword_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Keyword_userId_idx" ON public."Keyword" USING btree ("userId");


--
-- Name: KnowledgeBaseSearch_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "KnowledgeBaseSearch_userId_idx" ON public."KnowledgeBaseSearch" USING btree ("userId");


--
-- Name: LoopRun_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LoopRun_campaignId_idx" ON public."LoopRun" USING btree ("campaignId");


--
-- Name: LoopRun_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LoopRun_userId_createdAt_idx" ON public."LoopRun" USING btree ("userId", "createdAt");


--
-- Name: MarketIntelSnapshot_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MarketIntelSnapshot_productId_idx" ON public."MarketIntelSnapshot" USING btree ("productId");


--
-- Name: MarketIntelSnapshot_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MarketIntelSnapshot_userId_idx" ON public."MarketIntelSnapshot" USING btree ("userId");


--
-- Name: Offer_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Offer_userId_idx" ON public."Offer" USING btree ("userId");


--
-- Name: Offer_userId_offerId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Offer_userId_offerId_key" ON public."Offer" USING btree ("userId", "offerId");


--
-- Name: Presell_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Presell_campaignId_idx" ON public."Presell" USING btree ("campaignId");


--
-- Name: Presell_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Presell_slug_key" ON public."Presell" USING btree (slug);


--
-- Name: Presell_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Presell_userId_idx" ON public."Presell" USING btree ("userId");


--
-- Name: ProductResearch_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProductResearch_userId_idx" ON public."ProductResearch" USING btree ("userId");


--
-- Name: ProductResearch_userId_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProductResearch_userId_name_key" ON public."ProductResearch" USING btree ("userId", name);


--
-- Name: Session_sessionToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" USING btree ("sessionToken");


--
-- Name: TestResult_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TestResult_userId_idx" ON public."TestResult" USING btree ("userId");


--
-- Name: TestResult_userId_testId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "TestResult_userId_testId_key" ON public."TestResult" USING btree ("userId", "testId");


--
-- Name: UsagePayment_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UsagePayment_userId_idx" ON public."UsagePayment" USING btree ("userId");


--
-- Name: UsagePayment_userId_period_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UsagePayment_userId_period_key" ON public."UsagePayment" USING btree ("userId", period);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: VerificationToken_identifier_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);


--
-- Name: VerificationToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AgentRun AgentRun_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AgentRun"
    ADD CONSTRAINT "AgentRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AtpSearch AtpSearch_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AtpSearch"
    ADD CONSTRAINT "AtpSearch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."Campaign"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AtpSearch AtpSearch_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AtpSearch"
    ADD CONSTRAINT "AtpSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BridgePageStrategyRecommendation BridgePageStrategyRecommendation_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BridgePageStrategyRecommendation"
    ADD CONSTRAINT "BridgePageStrategyRecommendation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."Campaign"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BridgePageStrategyRecommendation BridgePageStrategyRecommendation_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BridgePageStrategyRecommendation"
    ADD CONSTRAINT "BridgePageStrategyRecommendation_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."ProductResearch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CampaignChecklist CampaignChecklist_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CampaignChecklist"
    ADD CONSTRAINT "CampaignChecklist_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."Campaign"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CampaignDecision CampaignDecision_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CampaignDecision"
    ADD CONSTRAINT "CampaignDecision_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."Campaign"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CampaignDecision CampaignDecision_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CampaignDecision"
    ADD CONSTRAINT "CampaignDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Campaign Campaign_productResearchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Campaign"
    ADD CONSTRAINT "Campaign_productResearchId_fkey" FOREIGN KEY ("productResearchId") REFERENCES public."ProductResearch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Campaign Campaign_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Campaign"
    ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChecklistLearning ChecklistLearning_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChecklistLearning"
    ADD CONSTRAINT "ChecklistLearning_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailyLog DailyLog_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DailyLog"
    ADD CONSTRAINT "DailyLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."Campaign"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailyLog DailyLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DailyLog"
    ADD CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GoogleAdsExperimentArm GoogleAdsExperimentArm_experimentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GoogleAdsExperimentArm"
    ADD CONSTRAINT "GoogleAdsExperimentArm_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES public."GoogleAdsExperiment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GoogleAdsExperimentMetricSnapshot GoogleAdsExperimentMetricSnapshot_experimentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GoogleAdsExperimentMetricSnapshot"
    ADD CONSTRAINT "GoogleAdsExperimentMetricSnapshot_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES public."GoogleAdsExperiment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GoogleAdsExperimentOperation GoogleAdsExperimentOperation_experimentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GoogleAdsExperimentOperation"
    ADD CONSTRAINT "GoogleAdsExperimentOperation_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES public."GoogleAdsExperiment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GoogleAdsExperiment GoogleAdsExperiment_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GoogleAdsExperiment"
    ADD CONSTRAINT "GoogleAdsExperiment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."Campaign"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GoogleAdsExperiment GoogleAdsExperiment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GoogleAdsExperiment"
    ADD CONSTRAINT "GoogleAdsExperiment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Integration Integration_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Integration"
    ADD CONSTRAINT "Integration_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Keyword Keyword_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Keyword"
    ADD CONSTRAINT "Keyword_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."Campaign"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Keyword Keyword_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Keyword"
    ADD CONSTRAINT "Keyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KnowledgeBaseSearch KnowledgeBaseSearch_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."KnowledgeBaseSearch"
    ADD CONSTRAINT "KnowledgeBaseSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LoopRun LoopRun_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LoopRun"
    ADD CONSTRAINT "LoopRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."Campaign"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MarketIntelSnapshot MarketIntelSnapshot_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MarketIntelSnapshot"
    ADD CONSTRAINT "MarketIntelSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."ProductResearch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MarketIntelSnapshot MarketIntelSnapshot_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MarketIntelSnapshot"
    ADD CONSTRAINT "MarketIntelSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Offer Offer_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Offer"
    ADD CONSTRAINT "Offer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Presell Presell_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Presell"
    ADD CONSTRAINT "Presell_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."Campaign"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Presell Presell_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Presell"
    ADD CONSTRAINT "Presell_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductResearch ProductResearch_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductResearch"
    ADD CONSTRAINT "ProductResearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TestResult TestResult_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TestResult"
    ADD CONSTRAINT "TestResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UsagePayment UsagePayment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UsagePayment"
    ADD CONSTRAINT "UsagePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict bmnBUDCBlrA0Hy2vlXX4skMqZzHRV6EyUDQ3JJSnTvIuqLIYMhLhlZkGm8llBns

