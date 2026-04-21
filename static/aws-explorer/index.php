<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AWS to Terraform Exporter</title>
    <script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js"></script>
    <script src="https://sdk.amazonaws.com/js/aws-sdk-2.1048.0.min.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/98.css">
    <style><?php include('css/style.css'); ?></style>
</head>
<body>
    <div id="app">
				<?php include('modals/credentials-modal.php'); ?>
        
				<?php include('modals/export-modal.php'); ?>
        
				<?php include('modals/instancedetail-modal.php'); ?>
        
				<?php include('modals/databasedetail-modal.php'); ?>
        
				<?php include('modals/valkeydetail-modal.php'); ?>
        
        <!-- Loading overlay with hourglass animation -->
        <div class="loading-overlay" :class="{ active: apiLoading }">
            <div class="hourglass-container">
                <img src="img/hourglass-timer.gif" alt="Loading..." />
            </div>
        </div>

        <header>
            <div class="window-title-text">AWS to Terraform Exporter</div>
            <div style="margin-left: auto; display: flex; gap: 10px; align-items: center;">
                <span v-if="isConnected" style="margin-right: 10px; font-size: 11px; color: white;">{{ getUsernameFromArn() }}</span>
                <button v-if="isConnected" @click="logout" style="min-width: 70px; font-size: 11px;">Logout</button>
                <button v-else @click="showCredentialsModal = true" style="min-width: 90px; font-size: 11px;">Connect to AWS</button>
            </div>
        </header>
        <div class="main-container">
            <nav>
                <h3>Resources</h3>
                <div v-for="(service, index) in services" :key="index">
                    <!-- Service with submenu -->
                    <div v-if="service.submenu" class="service-group">
                        <div 
                            class="nav-item service-header" 
                            @click="toggleServiceExpand(service)">
                            {{ service.name }}
                            <span class="expand-icon">{{ service.expanded ? '▼' : '▶' }}</span>
                        </div>
                        <!-- Submenu items -->
                        <div class="submenu" v-if="service.expanded">
                            <div 
                                v-for="(subitem, subIndex) in service.submenu" 
                                :key="subIndex" 
                                class="nav-item submenu-item" 
                                :class="{ active: currentService === subitem.id }"
                                @click="selectService(subitem.id)">
                                {{ subitem.name }}
                            </div>
                        </div>
                    </div>
                    <!-- Regular service without submenu -->
                    <div 
                        v-else
                        class="nav-item" 
                        :class="{ active: currentService === service.id }"
                        @click="selectService(service.id)">
                        {{ service.name }}
                    </div>
                </div>
            </nav>
            <div class="content">
                <div v-if="!isConnected">
                    <h2>Welcome to AWS Terraform Exporter</h2>
                    <p>Please enter your AWS credentials to get started.</p>
                </div>
                <div v-else>
                    <h2>{{ getCurrentServiceName() }}</h2>
                    
                    <!-- Search Box -->
                    <div v-if="!loading && resources.length > 0" class="search-container" style="margin-bottom: 15px;">
                        <input 
                            v-model="searchQuery" 
                            type="text" 
                            placeholder="Search instances..." 
                            style="width: 300px; display: inline-block; margin-right: 10px;">
                        <button v-if="resources.length > 0" @click="exportToTerraform">Export to Terraform</button>
                    </div>

                    <div v-if="loading">Loading resources...</div>
                    <div v-else-if="resources.length === 0">No resources found.</div>
                    
                    <!-- Generic Resource Table -->
                    <div v-else-if="resources.length > 0" class="resource-table">
                        <table>
                            <thead>
                                <tr>
                                    <template v-if="currentService !== 'load_balancers'">
                                        <th @click="sortBy('name')">
                                            Name 
                                            <span v-if="sortKey === 'name'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('id')">
                                            ID
                                            <span v-if="sortKey === 'id'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- EC2 Instances specific columns -->
                                    <template v-if="currentService === 'ec2_instances'">
                                        <th @click="sortBy('state')">
                                            State
                                            <span v-if="sortKey === 'state'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('type')">
                                            Instance Type
                                            <span v-if="sortKey === 'type'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('az')">
                                            Availability Zone
                                            <span v-if="sortKey === 'az'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('publicIp')">
                                            Public IP
                                            <span v-if="sortKey === 'publicIp'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('privateIp')">
                                            Private IP
                                            <span v-if="sortKey === 'privateIp'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('keyName')">
                                            Key Name
                                            <span v-if="sortKey === 'keyName'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('launchTime')">
                                            Launch Time
                                            <span v-if="sortKey === 'launchTime'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('platform')">
                                            Platform
                                            <span v-if="sortKey === 'platform'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- Elastic IPs specific columns -->
                                    <template v-if="currentService === 'elastic_ips'">
                                        <th @click="sortBy('publicIp')">
                                            Public IP
                                            <span v-if="sortKey === 'publicIp'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('privateIp')">
                                            Private IP
                                            <span v-if="sortKey === 'privateIp'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('instanceId')">
                                            Instance ID
                                            <span v-if="sortKey === 'instanceId'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('domain')">
                                            Domain
                                            <span v-if="sortKey === 'domain'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- EBS Volumes specific columns -->
                                    <template v-if="currentService === 'ebs_volumes'">
                                        <th @click="sortBy('size')">
                                            Size
                                            <span v-if="sortKey === 'size'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('type')">
                                            Type
                                            <span v-if="sortKey === 'type'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('state')">
                                            State
                                            <span v-if="sortKey === 'state'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('az')">
                                            Availability Zone
                                            <span v-if="sortKey === 'az'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('instanceId')">
                                            Attached To
                                            <span v-if="sortKey === 'instanceId'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- Security Groups specific columns -->
                                    <template v-if="currentService === 'security_groups'">
                                        <th @click="sortBy('description')">
                                            Description
                                            <span v-if="sortKey === 'description'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('vpcId')">
                                            VPC ID
                                            <span v-if="sortKey === 'vpcId'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('ingressRulesCount')">
                                            Ingress Rules
                                            <span v-if="sortKey === 'ingressRulesCount'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('egressRulesCount')">
                                            Egress Rules
                                            <span v-if="sortKey === 'egressRulesCount'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- Key Pairs specific columns -->
                                    <template v-if="currentService === 'key_pairs'">
                                        <th @click="sortBy('keyType')">
                                            Key Type
                                            <span v-if="sortKey === 'keyType'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('fingerprint')">
                                            Fingerprint
                                            <span v-if="sortKey === 'fingerprint'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- AMIs specific columns -->
                                    <template v-if="currentService === 'amis'">
                                        <th @click="sortBy('platform')">
                                            Platform
                                            <span v-if="sortKey === 'platform'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('architecture')">
                                            Architecture
                                            <span v-if="sortKey === 'architecture'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('state')">
                                            State
                                            <span v-if="sortKey === 'state'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('createdAt')">
                                            Created
                                            <span v-if="sortKey === 'createdAt'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- Network Interfaces specific columns -->
                                    <template v-if="currentService === 'network_interfaces'">
                                        <th @click="sortBy('privateIp')">
                                            Private IP
                                            <span v-if="sortKey === 'privateIp'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('publicIp')">
                                            Public IP
                                            <span v-if="sortKey === 'publicIp'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('vpcId')">
                                            VPC ID
                                            <span v-if="sortKey === 'vpcId'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('subnetId')">
                                            Subnet ID
                                            <span v-if="sortKey === 'subnetId'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('status')">
                                            Status
                                            <span v-if="sortKey === 'status'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('instanceId')">
                                            Attached To
                                            <span v-if="sortKey === 'instanceId'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- S3 Buckets specific columns -->
                                    <template v-if="currentService === 's3'">
                                        <th @click="sortBy('creationDate')">
                                            Creation Date
                                            <span v-if="sortKey === 'creationDate'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('region')">
                                            Region
                                            <span v-if="sortKey === 'region'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('accessControl')">
                                            ACL
                                            <span v-if="sortKey === 'accessControl'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('publicStatus')">
                                            Public Access
                                            <span v-if="sortKey === 'publicStatus'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('versioning')">
                                            Versioning
                                            <span v-if="sortKey === 'versioning'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('encryption')">
                                            Encryption
                                            <span v-if="sortKey === 'encryption'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- VPC specific columns -->
                                    <template v-if="currentService === 'vpcs'">
                                        <th @click="sortBy('cidr')">
                                            CIDR Block
                                            <span v-if="sortKey === 'cidr'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('state')">
                                            State
                                            <span v-if="sortKey === 'state'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('isDefault')">
                                            Default
                                            <span v-if="sortKey === 'isDefault'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('tenancy')">
                                            Tenancy
                                            <span v-if="sortKey === 'tenancy'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- Route Table specific columns -->
                                    <template v-if="currentService === 'route_tables'">
                                        <th @click="sortBy('vpcId')">
                                            VPC ID
                                            <span v-if="sortKey === 'vpcId'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('routeCount')">
                                            Routes
                                            <span v-if="sortKey === 'routeCount'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('associationCount')">
                                            Associations
                                            <span v-if="sortKey === 'associationCount'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('isMain')">
                                            Main
                                            <span v-if="sortKey === 'isMain'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- Subnet specific columns -->
                                    <template v-if="currentService === 'subnets'">
                                        <th @click="sortBy('vpcId')">
                                            VPC ID
                                            <span v-if="sortKey === 'vpcId'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('cidr')">
                                            CIDR Block
                                            <span v-if="sortKey === 'cidr'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('az')">
                                            Availability Zone
                                            <span v-if="sortKey === 'az'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('availableIpCount')">
                                            Available IPs
                                            <span v-if="sortKey === 'availableIpCount'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('state')">
                                            State
                                            <span v-if="sortKey === 'state'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('public')">
                                            Public IP Mapping
                                            <span v-if="sortKey === 'public'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- Load Balancer specific columns -->
                                    <template v-if="currentService === 'load_balancers'">
                                        <th @click="sortBy('name')">
                                            Name
                                            <span v-if="sortKey === 'name'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('type')">
                                            Type
                                            <span v-if="sortKey === 'type'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('scheme')">
                                            Scheme
                                            <span v-if="sortKey === 'scheme'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('vpcId')">
                                            VPC
                                            <span v-if="sortKey === 'vpcId'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('state')">
                                            State
                                            <span v-if="sortKey === 'state'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('createdTime')">
                                            Created
                                            <span v-if="sortKey === 'createdTime'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- RDS Database specific columns -->
                                    <template v-if="currentService === 'rds'">
                                        <th @click="sortBy('engine')">
                                            Engine
                                            <span v-if="sortKey === 'engine'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('instanceClass')">
                                            Instance Size
                                            <span v-if="sortKey === 'instanceClass'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('storage')">
                                            Storage
                                            <span v-if="sortKey === 'storage'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('vpcId')">
                                            VPC
                                            <span v-if="sortKey === 'vpcId'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('region')">
                                            Region
                                            <span v-if="sortKey === 'region'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('status')">
                                            Status
                                            <span v-if="sortKey === 'status'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('multiAZ')">
                                            Multi-AZ
                                            <span v-if="sortKey === 'multiAZ'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- ElastiCache specific columns -->
                                    <template v-if="currentService === 'elasticache'">
                                        <th @click="sortBy('engine')">
                                            Engine
                                            <span v-if="sortKey === 'engine'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('version')">
                                            Version
                                            <span v-if="sortKey === 'version'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('nodeType')">
                                            Node Type
                                            <span v-if="sortKey === 'nodeType'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('numNodes')">
                                            Nodes
                                            <span v-if="sortKey === 'numNodes'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('subnet')">
                                            Subnet Group
                                            <span v-if="sortKey === 'subnet'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('status')">
                                            Status
                                            <span v-if="sortKey === 'status'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('endpoint')">
                                            Endpoint
                                            <span v-if="sortKey === 'endpoint'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- Redis Clusters specific columns -->
                                    <template v-if="currentService === 'redis_clusters'">
                                        <th @click="sortBy('description')">
                                            Description
                                            <span v-if="sortKey === 'description'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('nodeType')">
                                            Node Type
                                            <span v-if="sortKey === 'nodeType'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('numNodes')">
                                            Nodes
                                            <span v-if="sortKey === 'numNodes'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('multiAZ')">
                                            Multi-AZ
                                            <span v-if="sortKey === 'multiAZ'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('status')">
                                            Status
                                            <span v-if="sortKey === 'status'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('primaryEndpoint')">
                                            Primary Endpoint
                                            <span v-if="sortKey === 'primaryEndpoint'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- Subnet Groups specific columns -->
                                    <template v-if="currentService === 'subnet_groups'">
                                        <th @click="sortBy('description')">
                                            Description
                                            <span v-if="sortKey === 'description'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('type')">
                                            Type
                                            <span v-if="sortKey === 'type'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('vpcId')">
                                            VPC
                                            <span v-if="sortKey === 'vpcId'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('subnets')">
                                            Subnets
                                            <span v-if="sortKey === 'subnets'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('status')">
                                            Status
                                            <span v-if="sortKey === 'status'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- LB Listener specific columns -->
                                    <template v-if="currentService === 'lb_listeners'">
                                        <th @click="sortBy('lbName')">
                                            Load Balancer
                                            <span v-if="sortKey === 'lbName'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('protocol')">
                                            Protocol
                                            <span v-if="sortKey === 'protocol'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('port')">
                                            Port
                                            <span v-if="sortKey === 'port'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('defaultAction')">
                                            Default Action
                                            <span v-if="sortKey === 'defaultAction'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('sslPolicy')">
                                            SSL Policy
                                            <span v-if="sortKey === 'sslPolicy'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                    
                                    <!-- LB Target Group specific columns -->
                                    <template v-if="currentService === 'lb_target_groups'">
                                        <th @click="sortBy('targetType')">
                                            Target Type
                                            <span v-if="sortKey === 'targetType'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('protocol')">
                                            Protocol
                                            <span v-if="sortKey === 'protocol'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('port')">
                                            Port
                                            <span v-if="sortKey === 'port'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('vpcId')">
                                            VPC
                                            <span v-if="sortKey === 'vpcId'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('healthCheckProtocol')">
                                            Health Check Protocol
                                            <span v-if="sortKey === 'healthCheckProtocol'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('healthCheckPath')">
                                            Health Check Path
                                            <span v-if="sortKey === 'healthCheckPath'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('targetCount')">
                                            Targets
                                            <span v-if="sortKey === 'targetCount'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                        <th @click="sortBy('healthStatus')">
                                            Health Status
                                            <span v-if="sortKey === 'healthStatus'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                                        </th>
                                    </template>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(resource, index) in filteredResources" :key="index" 
                                    @click="handleResourceClick(resource)">
                                    <template v-if="currentService !== 'load_balancers'">
                                        <td>{{ resource.name }}</td>
                                        <td>{{ resource.id }}</td>
                                    </template>
                                    
                                    <!-- EC2 Instances specific columns -->
                                    <template v-if="currentService === 'ec2_instances'">
                                        <td>
                                            <span :class="'state-indicator ' + resource.state">
                                                {{ resource.state }}
                                            </span>
                                        </td>
                                        <td>{{ resource.type }}</td>
                                        <td>{{ resource.az }}</td>
                                        <td>{{ resource.publicIp }}</td>
                                        <td>{{ resource.privateIp }}</td>
                                        <td>{{ resource.keyName }}</td>
                                        <td>{{ formatDate(resource.launchTime) }}</td>
                                        <td>{{ resource.platform || 'Linux/Unix' }}</td>
                                    </template>
                                    
                                    <!-- Elastic IPs specific columns -->
                                    <template v-if="currentService === 'elastic_ips'">
                                        <td>{{ resource.publicIp }}</td>
                                        <td>{{ resource.privateIp }}</td>
                                        <td>{{ resource.instanceId }}</td>
                                        <td>{{ resource.domain }}</td>
                                    </template>
                                    
                                    <!-- EBS Volumes specific columns -->
                                    <template v-if="currentService === 'ebs_volumes'">
                                        <td>{{ resource.size }}</td>
                                        <td>{{ resource.type }}</td>
                                        <td>{{ resource.state }}</td>
                                        <td>{{ resource.az }}</td>
                                        <td>
                                            <resource-ref v-if="resource.instanceId && resource.instanceId !== '-'" 
                                                        :resource-id="resource.instanceId">
                                            </resource-ref>
                                            <span v-else>{{ resource.instanceId }}</span>
                                        </td>
                                    </template>
                                    
                                    <!-- Security Groups specific columns -->
                                    <template v-if="currentService === 'security_groups'">
                                        <td>{{ resource.description }}</td>
                                        <td>{{ resource.vpcId }}</td>
                                        <td>{{ resource.ingressRulesCount }}</td>
                                        <td>{{ resource.egressRulesCount }}</td>
                                    </template>
                                    
                                    <!-- Key Pairs specific columns -->
                                    <template v-if="currentService === 'key_pairs'">
                                        <td>{{ resource.keyType }}</td>
                                        <td>{{ resource.fingerprint }}</td>
                                    </template>
                                    
                                    <!-- AMIs specific columns -->
                                    <template v-if="currentService === 'amis'">
                                        <td>{{ resource.platform }}</td>
                                        <td>{{ resource.architecture }}</td>
                                        <td>{{ resource.state }}</td>
                                        <td>{{ formatDate(resource.createdAt) }}</td>
                                    </template>
                                    
                                    <!-- Network Interfaces specific columns -->
                                    <template v-if="currentService === 'network_interfaces'">
                                        <td>{{ resource.privateIp }}</td>
                                        <td>{{ resource.publicIp }}</td>
                                        <td><resource-ref v-if="resource.vpcId" :resource-id="resource.vpcId"></resource-ref></td>
                                        <td><resource-ref v-if="resource.subnetId" :resource-id="resource.subnetId"></resource-ref></td>
                                        <td>{{ resource.status }}</td>
                                        <td>
                                            <resource-ref v-if="resource.instanceId && resource.instanceId !== '-'" 
                                                         :resource-id="resource.instanceId">
                                            </resource-ref>
                                            <span v-else>{{ resource.instanceId }}</span>
                                        </td>
                                    </template>
                                    
                                    <!-- S3 Buckets specific columns -->
                                    <template v-if="currentService === 's3'">
                                        <td>{{ formatDate(resource.creationDate) }}</td>
                                        <td>{{ resource.region }}</td>
                                        <td>{{ resource.accessControl }}</td>
                                        <td>{{ resource.publicStatus }}</td>
                                        <td>{{ resource.versioning }}</td>
                                        <td>{{ resource.encryption }}</td>
                                    </template>
                                    
                                    <!-- VPC specific columns -->
                                    <template v-if="currentService === 'vpcs'">
                                        <td>{{ resource.cidr }}</td>
                                        <td>{{ resource.state }}</td>
                                        <td>{{ resource.isDefault }}</td>
                                        <td>{{ resource.tenancy }}</td>
                                    </template>
                                    
                                    <!-- Route Table specific columns -->
                                    <template v-if="currentService === 'route_tables'">
                                        <td><resource-ref v-if="resource.vpcId" :resource-id="resource.vpcId"></resource-ref></td>
                                        <td>{{ resource.routeCount }}</td>
                                        <td>{{ resource.associationCount }}</td>
                                        <td>{{ resource.isMain }}</td>
                                    </template>
                                    
                                    <!-- Subnet specific columns -->
                                    <template v-if="currentService === 'subnets'">
                                        <td><resource-ref v-if="resource.vpcId" :resource-id="resource.vpcId"></resource-ref></td>
                                        <td>{{ resource.cidr }}</td>
                                        <td>{{ resource.az }}</td>
                                        <td>{{ resource.availableIpCount }}</td>
                                        <td>{{ resource.state }}</td>
                                        <td>{{ resource.public }}</td>
                                    </template>
                                    
                                    <!-- Load Balancer specific columns -->
                                    <template v-if="currentService === 'load_balancers'">
                                        <td>
                                            <span class="lb-name" style="position: relative; cursor: default;">
                                                {{ resource.name }}
                                                <div class="resource-tooltip">
                                                    <div class="resource-name">{{ resource.name }}</div>
                                                    <div class="resource-detail"><strong>ARN:</strong> {{ resource.id }}</div>
                                                    <div class="resource-detail"><strong>DNS:</strong> {{ resource.dnsName }}</div>
                                                </div>
                                            </span>
                                        </td>
                                        <td>{{ resource.type }}</td>
                                        <td>{{ resource.scheme }}</td>
                                        <td>
                                            <span v-if="resource.vpcId" class="resource-ref">
                                                {{ resource.vpcName }}
                                                <div class="resource-tooltip">
                                                    <div class="resource-id">{{ resource.vpcId }}</div>
                                                    <div v-if="getResourceDetails(resource.vpcId) && getResourceDetails(resource.vpcId).details" 
                                                         class="resource-details">{{ getResourceDetails(resource.vpcId).details }}</div>
                                                </div>
                                            </span>
                                            <span v-else>-</span>
                                        </td>
                                        <td>{{ resource.state }}</td>
                                        <td>{{ formatDate(resource.createdTime) }}</td>
                                    </template>
                                    
                                    <!-- RDS Database specific columns -->
                                    <template v-if="currentService === 'rds'">
                                        <td>{{ resource.engine }}</td>
                                        <td>{{ resource.instanceClass }}</td>
                                        <td>{{ resource.storage }}</td>
                                        <td>
                                            <span v-if="resource.vpcId && resource.vpcId !== '-'" class="resource-ref">
                                                {{ resource.vpcName }}
                                                <div class="resource-tooltip">
                                                    <div class="resource-id">{{ resource.vpcId }}</div>
                                                    <div v-if="getResourceDetails(resource.vpcId) && getResourceDetails(resource.vpcId).details" 
                                                         class="resource-details">{{ getResourceDetails(resource.vpcId).details }}</div>
                                                </div>
                                            </span>
                                            <span v-else>-</span>
                                        </td>
                                        <td>{{ resource.region }}</td>
                                        <td>
                                            <span :class="'state-indicator ' + resource.status.toLowerCase()">
                                                {{ resource.status }}
                                            </span>
                                        </td>
                                        <td>{{ resource.multiAZ }}</td>
                                    </template>
                                    
                                    <!-- ElastiCache specific columns -->
                                    <template v-if="currentService === 'elasticache'">
                                        <td>{{ resource.engine }}</td>
                                        <td>{{ resource.version }}</td>
                                        <td>{{ resource.nodeType }}</td>
                                        <td>{{ resource.numNodes }}</td>
                                        <td>{{ resource.subnet }}</td>
                                        <td>
                                            <span :class="'state-indicator ' + resource.status.toLowerCase().replace(/\s+/g, '-')">
                                                {{ resource.status }}
                                            </span>
                                        </td>
                                        <td>{{ resource.endpoint }}</td>
                                    </template>
                                    
                                    <!-- Redis Clusters specific columns -->
                                    <template v-if="currentService === 'redis_clusters'">
                                        <td>{{ resource.description }}</td>
                                        <td>{{ resource.nodeType }}</td>
                                        <td>{{ resource.numNodes }}</td>
                                        <td>{{ resource.multiAZ }}</td>
                                        <td>
                                            <span :class="'state-indicator ' + resource.status.toLowerCase().replace(/\s+/g, '-')">
                                                {{ resource.status }}
                                            </span>
                                        </td>
                                        <td>{{ resource.primaryEndpoint }}</td>
                                    </template>
                                    
                                    <!-- Subnet Groups specific columns -->
                                    <template v-if="currentService === 'subnet_groups'">
                                        <td>{{ resource.description }}</td>
                                        <td>{{ resource.type }}</td>
                                        <td>
                                            <span v-if="resource.vpcId && resource.vpcId !== '-'" class="resource-ref">
                                                {{ getResourceDetails(resource.vpcId) ? 
                                                    getResourceDetails(resource.vpcId).name : resource.vpcId }}
                                                <div class="resource-tooltip">
                                                    <div class="resource-id">{{ resource.vpcId }}</div>
                                                    <div v-if="getResourceDetails(resource.vpcId) && getResourceDetails(resource.vpcId).details" 
                                                         class="resource-details">{{ getResourceDetails(resource.vpcId).details }}</div>
                                                </div>
                                            </span>
                                            <span v-else>-</span>
                                        </td>
                                        <td>{{ resource.subnets }}</td>
                                        <td>
                                            <span v-if="resource.status" :class="'state-indicator ' + resource.status.toLowerCase()">
                                                {{ resource.status }}
                                            </span>
                                            <span v-else>-</span>
                                        </td>
                                    </template>
                                    
                                    <!-- LB Listener specific columns -->
                                    <template v-if="currentService === 'lb_listeners'">
                                        <td>{{ resource.lbName }}</td>
                                        <td>{{ resource.protocol }}</td>
                                        <td>{{ resource.port }}</td>
                                        <td>{{ resource.defaultAction }}</td>
                                        <td>{{ resource.sslPolicy }}</td>
                                    </template>
                                    
                                    <!-- LB Target Group specific columns -->
                                    <template v-if="currentService === 'lb_target_groups'">
                                        <td>{{ resource.targetType }}</td>
                                        <td>{{ resource.protocol }}</td>
                                        <td>{{ resource.port }}</td>
                                        <td>
                                            <span v-if="resource.vpcId" class="resource-ref">
                                                {{ resource.vpcName || (getResourceDetails(resource.vpcId) ? getResourceDetails(resource.vpcId).name : resource.vpcId) }}
                                                <div class="resource-tooltip">
                                                    <div class="resource-id">{{ resource.vpcId }}</div>
                                                    <div v-if="getResourceDetails(resource.vpcId) && getResourceDetails(resource.vpcId).details" 
                                                         class="resource-details">{{ getResourceDetails(resource.vpcId).details }}</div>
                                                </div>
                                            </span>
                                            <span v-else>-</span>
                                        </td>
                                        <td>{{ resource.healthCheckProtocol }}</td>
                                        <td>{{ resource.healthCheckPath }}</td>
                                        <td>{{ resource.targetCount }}</td>
                                        <td>{{ resource.healthStatus }}</td>
                                    </template>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Default view for other resources -->
                    <div v-else>
                        <ul>
                            <li v-for="(resource, index) in resources" :key="index">{{ resource.name }}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script><?php include('js/app.js'); ?></script>
</body>
</html>
