    // Global component for resource references
    Vue.component('resource-ref', {
        props: {
            resourceId: {
                type: String,
                required: true
            }
        },
        computed: {
            formattedResource() {
                if (!this.resourceId) {
                    return {
                        id: '-',
                        shortId: '-',
                        prefix: '',
                        type: 'Unknown',
                        name: null,
                        details: null
                    };
                }
                return this.$root.formatResourceId(this.resourceId);
            },
            hasDetails() {
                return this.formattedResource && (this.formattedResource.name || this.formattedResource.details);
            }
        },
        template: `
            <span class="resource-ref">
                <template v-if="formattedResource.name">
                    {{ formattedResource.name }}
                </template>
                <template v-else>
                    <span v-if="formattedResource.prefix" class="prefix">{{ formattedResource.prefix }}</span>
                    <span>{{ formattedResource.shortId }}</span>
                </template>
                <div v-if="hasDetails" class="resource-tooltip">
                    <div class="resource-id">{{ formattedResource.id }}</div>
                    <div v-if="formattedResource.details" class="resource-details">{{ formattedResource.details }}</div>
                </div>
            </span>
        `
    });
    
    new Vue({
            el: '#app',
            mounted: function() {
                // Show initial loading animation
                this.apiLoading = true;
                setTimeout(() => {
                    // Initialize draggable functionality for all modal windows
                    this.initDraggableModals();
                    this.apiLoading = false;
                }, 2500);
                
                // Hook into AWS SDK to track API calls
                this.setupAwsSdkMonitoring();
                
                // Set up event listener for page unload (browser close/refresh)
                const self = this;
                window.addEventListener('beforeunload', function() {
                    // If user is logged in, clear cache when browser is closed
                    if (self.isConnected) {
                        // We can't use the method directly here as it might not execute fully
                        // during page unload, so we manually clear specific keys
                        
                        // Get all localStorage keys that start with aws_resources_
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && key.startsWith('aws_resources_')) {
                                localStorage.removeItem(key);
                            }
                        }
                    }
                });
            },
            data: {
                apiLoading: false,
                apiCallCounter: 0,
                accessKey: '',
                secretKey: '',
                sessionToken: '',
                region: 'us-east-1',
                isConnected: false,
                currentService: '',
                loading: false,
                resources: [],
                showCredentialsModal: false, // Will be set based on session status
                showExportModal: false,
                showInstanceDetailModal: false,
                credentialsLoading: false,
                credentialsError: '',
                identityInfo: '',
                searchQuery: '',
                sortKey: 'name',
                sortOrder: 'asc',
                // Resource detail modal data
                // EC2 instance modal
                showInstanceDetailModal: false,
                selectedInstance: {},
                currentInstanceTab: 'details',
                instanceDetailTabs: [
                    { id: 'details', name: 'Details' },
                    { id: 'networking', name: 'Networking' },
                    { id: 'storage', name: 'Storage' },
                    { id: 'security', name: 'Security' },
                    { id: 'tags', name: 'Tags' },
                    { id: 'terraform', name: 'Terraform' }
                ],
                instanceNetworkInterfaces: [],
                instanceElasticIPs: [],
                instanceVolumes: [],
                instanceTerraformCode: '',
                
                // RDS database modal
                showDatabaseDetailModal: false,
                selectedDatabase: {},
                currentDatabaseTab: 'details',
                databaseDetailTabs: [
                    { id: 'details', name: 'Details' },
                    { id: 'network', name: 'Network' },
                    { id: 'storage', name: 'Storage' },
                    { id: 'security', name: 'Security' },
                    { id: 'terraform', name: 'Terraform' }
                ],
                databaseSecurityGroups: [],
                databaseSubnets: [],
                databaseParameterGroups: [],
                databaseTerraformCode: '',
                
                // ElastiCache ValKey modal
                showValKeyDetailModal: false,
                selectedValKey: {},
                currentValKeyTab: 'details',
                valKeyDetailTabs: [
                    { id: 'details', name: 'Details' },
                    { id: 'network', name: 'Network' },
                    { id: 'configuration', name: 'Configuration' },
                    { id: 'security', name: 'Security' },
                    { id: 'tags', name: 'Tags' },
                    { id: 'terraform', name: 'Terraform' }
                ],
                valKeyNodes: [],
                valKeySecurityGroups: [],
                valKeyTerraformCode: '',
                // Terraform export options
                exportOptions: {
                    includeState: true,
                    includeProviders: true,
                    useModules: false,
                    includeComments: true
                },
                exportSelectedResources: [],
                // Resource caching
                cachedResources: {
                    vpcs: [],
                    subnets: [],
                    securityGroups: [],
                    instances: []
                },
                resourceMap: {}, // For fast lookups by ID
                services: [
                    { 
                        id: 'ec2_resources', 
                        name: 'EC2 Resources',
                        submenu: [
                            { id: 'ec2_instances', name: 'EC2 Instances' },
                            { id: 'ebs_volumes', name: 'EBS Volumes' },
                            { id: 'amis', name: 'AMIs' },
                            { id: 'security_groups', name: 'Security Groups' },
                            { id: 'key_pairs', name: 'Key Pairs' }
                        ],
                        expanded: false
                    },
                    { 
                        id: 'networking', 
                        name: 'Networking',
                        submenu: [
                            { id: 'load_balancers', name: 'Load Balancers' },
                            { id: 'lb_listeners', name: 'LB Listeners' },
                            { id: 'lb_target_groups', name: 'LB Target Groups' },
                            { id: 'network_interfaces', name: 'Network Interfaces' },
                            { id: 'elastic_ips', name: 'Elastic IPs' }
                        ],
                        expanded: false
                    },
                    { 
                        id: 'database_resources', 
                        name: 'Databases',
                        submenu: [
                            { id: 'rds', name: 'RDS Databases' },
                            { id: 'elasticache', name: 'ElastiCache Clusters' },
                            { id: 'redis_clusters', name: 'Redis Clusters' },
                            { id: 'valkey_clusters', name: 'ElastiCache Valkey' },
                            { id: 'subnet_groups', name: 'Subnet Groups' }
                        ],
                        expanded: false
                    },
                    { id: 's3', name: 'S3 Buckets' },
                    { id: 'lambda', name: 'Lambda Functions' },
                    { 
                        id: 'vpc_resources',
                        name: 'VPC Resources',
                        submenu: [
                            { id: 'vpcs', name: 'VPCs' },
                            { id: 'route_tables', name: 'Route Tables' },
                            { id: 'subnets', name: 'Subnets' }
                        ],
                        expanded: false
                    }
                ]
            },
            methods: {
                verifyCredentials: function() {
                    if (!this.accessKey || !this.secretKey) {
                        this.credentialsError = 'Please enter AWS credentials';
                        return;
                    }
                    
                    this.credentialsLoading = true;
                    this.credentialsError = '';
                    
                    // Configure AWS SDK
                    const awsConfig = {
                        accessKeyId: this.accessKey,
                        secretAccessKey: this.secretKey,
                        region: this.region
                    };
                    
                    // Add session token if provided
                    if (this.sessionToken) {
                        awsConfig.sessionToken = this.sessionToken;
                    }
                    
                    AWS.config.update(awsConfig);
                    
                    // Verify credentials using STS GetCallerIdentity
                    const sts = new AWS.STS();
                    sts.getCallerIdentity({}, (err, data) => {
                        this.credentialsLoading = false;
                        
                        if (err) {
                            console.error("Error verifying AWS credentials:", err);
                            this.credentialsError = 'Failed to verify AWS credentials: ' + err.message;
                            return;
                        }
                        
                        // Successfully verified credentials
                        this.isConnected = true;
                        this.identityInfo = data.Arn;
                        this.showCredentialsModal = false;
                        
                        // Store credentials in session storage
                        this.saveToSessionStorage({
                            accessKey: this.accessKey,
                            secretKey: this.secretKey,
                            sessionToken: this.sessionToken,
                            region: this.region,
                            identityInfo: data.Arn
                        });
                        
                        this.selectService('ec2'); // Default to EC2
                    });
                },
                configureAWS: function() {
                    this.showCredentialsModal = true;
                },
                logout: function() {
                    // Clear session storage
                    sessionStorage.removeItem('awsCredentials');
                    
                    // Clear all cached resources from localStorage
                    this.clearResourceCache();
                    
                    // Reset data
                    this.isConnected = false;
                    this.accessKey = '';
                    this.secretKey = '';
                    this.sessionToken = '';
                    this.identityInfo = '';
                    this.resources = [];
                    this.currentService = '';
                    this.cachedResources = {
                        vpcs: [],
                        subnets: [],
                        securityGroups: [],
                        instances: []
                    };
                    this.resourceMap = {};
                    
                    // Show login modal
                    this.showCredentialsModal = true;
                },
                
                // Clear all resource cache from localStorage
                clearResourceCache: function() {
                    // List of all resource types that might be cached
                    const resourceTypes = [
                        'vpcs', 
                        'subnets', 
                        'security_groups',
                        'ec2_instances',
                        'ebs_volumes',
                        'elastic_ips',
                        'amis',
                        'network_interfaces',
                        'route_tables',
                        'load_balancers',
                        'lb_target_groups',
                        'lb_listeners'
                    ];
                    
                    // Remove each resource type from localStorage
                    resourceTypes.forEach(type => {
                        try {
                            localStorage.removeItem(`aws_resources_${type}`);
                            console.log(`Cleared cache for ${type}`);
                        } catch (e) {
                            console.error(`Failed to clear cache for ${type}:`, e);
                        }
                    });
                    
                    console.log('All resource caches cleared');
                },
                saveToSessionStorage: function(credentials) {
                    try {
                        // Encrypt credentials for better security
                        // Note: This is still not 100% secure for production, but better than plain text
                        sessionStorage.setItem('awsCredentials', btoa(JSON.stringify(credentials)));
                    } catch (e) {
                        console.error('Failed to save credentials to session storage:', e);
                    }
                },
                loadFromSessionStorage: function() {
                    try {
                        const storedCredentials = sessionStorage.getItem('awsCredentials');
                        if (!storedCredentials) {
                            this.showCredentialsModal = true;
                            return false;
                        }
                        
                        // Decrypt credentials
                        const credentials = JSON.parse(atob(storedCredentials));
                        
                        // Restore credentials
                        this.accessKey = credentials.accessKey;
                        this.secretKey = credentials.secretKey;
                        this.sessionToken = credentials.sessionToken || '';
                        this.region = credentials.region;
                        this.identityInfo = credentials.identityInfo;
                        
                        // Configure AWS SDK
                        const awsConfig = {
                            accessKeyId: this.accessKey,
                            secretAccessKey: this.secretKey,
                            region: this.region
                        };
                        
                        if (this.sessionToken) {
                            awsConfig.sessionToken = this.sessionToken;
                        }
                        
                        AWS.config.update(awsConfig);
                        
                        // Load cached resource data if available
                        this.loadResourceCache();
                        
                        this.isConnected = true;
                        return true;
                    } catch (e) {
                        console.error('Failed to load credentials from session storage:', e);
                        this.showCredentialsModal = true;
                        return false;
                    }
                },
                
                // Save resources to local storage cache
                cacheResources: function(resourceType, resources) {
                    try {
                        // Store with timestamp for cache invalidation
                        const cacheData = {
                            timestamp: Date.now(),
                            data: resources
                        };
                        localStorage.setItem(`aws_resources_${resourceType}`, JSON.stringify(cacheData));
                        console.log(`Cached ${resources.length} ${resourceType} resources`);
                    } catch (e) {
                        console.error('Failed to cache resources:', e);
                    }
                },
                
                // Get resources from cache
                getResourcesFromCache: function(resourceType) {
                    try {
                        const cachedData = localStorage.getItem(`aws_resources_${resourceType}`);
                        if (!cachedData) return null;
                        
                        const cache = JSON.parse(cachedData);
                        
                        // Check if cache is fresh (less than 30 minutes old)
                        const cacheAge = Date.now() - cache.timestamp;
                        const maxAge = 30 * 60 * 1000; // 30 minutes
                        
                        if (cacheAge > maxAge) {
                            console.log(`Cache for ${resourceType} is stale (${Math.round(cacheAge/1000/60)} minutes old)`);
                            return null;
                        }
                        
                        console.log(`Using cached ${resourceType} data (${Math.round(cacheAge/1000/60)} minutes old)`);
                        return cache.data;
                    } catch (e) {
                        console.error('Failed to get resources from cache:', e);
                        return null;
                    }
                },
                
                // Load all resource caches on startup
                loadResourceCache: function() {
                    // Load commonly referenced resources into memory
                    this.cachedResources = {
                        vpcs: this.getResourcesFromCache('vpcs') || [],
                        subnets: this.getResourcesFromCache('subnets') || [],
                        securityGroups: this.getResourcesFromCache('security_groups') || [],
                        instances: this.getResourcesFromCache('ec2_instances') || []
                    };
                    
                    // Map resources by ID for quick lookup
                    this.resourceMap = {};
                    
                    // Map VPCs
                    this.cachedResources.vpcs.forEach(vpc => {
                        // Format multiple CIDR blocks if available
                        const cidrDisplay = vpc.cidrBlocks && vpc.cidrBlocks.length > 1 
                            ? vpc.cidrBlocks.join(', ')
                            : vpc.cidr;
                            
                        this.resourceMap[vpc.id] = {
                            name: vpc.name,
                            type: 'VPC',
                            details: `ID: ${vpc.id}${cidrDisplay ? '\nCIDR: ' + cidrDisplay : ''}`
                        };
                    });
                    
                    // Map Subnets
                    this.cachedResources.subnets.forEach(subnet => {
                        this.resourceMap[subnet.id] = {
                            name: subnet.name,
                            type: 'Subnet',
                            details: `ID: ${subnet.id}, CIDR: ${subnet.cidr}, AZ: ${subnet.az}`
                        };
                    });
                    
                    // Map Security Groups
                    this.cachedResources.securityGroups.forEach(sg => {
                        this.resourceMap[sg.id] = {
                            name: sg.name,
                            type: 'Security Group',
                            details: sg.description
                        };
                    });
                    
                    // Map EC2 Instances
                    this.cachedResources.instances.forEach(instance => {
                        this.resourceMap[instance.id] = {
                            name: instance.name,
                            type: 'EC2 Instance',
                            details: `Type: ${instance.type}, State: ${instance.state}`
                        };
                    });
                },
                
                // Get resource details by ID for tooltip
                getResourceDetails: function(resourceId) {
                    if (!resourceId) return null;
                    return this.resourceMap[resourceId] || null;
                },
                
                // Format resource ID with prefix
                formatResourceId: function(resourceId) {
                    if (!resourceId || typeof resourceId !== 'string') return resourceId;
                    
                    // Extract prefix based on AWS resource type patterns
                    const prefixMap = {
                        'i-': 'EC2 Instance',
                        'vpc-': 'VPC',
                        'subnet-': 'Subnet',
                        'sg-': 'Security Group',
                        'acl-': 'Network ACL',
                        'vol-': 'Volume',
                        'rtb-': 'Route Table',
                        'igw-': 'Internet Gateway',
                        'nat-': 'NAT Gateway',
                        'eni-': 'Network Interface',
                        'eip-': 'Elastic IP',
                        'ami-': 'AMI',
                        'snap-': 'Snapshot',
                        'lb-': 'Load Balancer',
                        'tg-': 'Target Group'
                    };
                    
                    // Find the matching prefix
                    for (const [prefix, resourceType] of Object.entries(prefixMap)) {
                        if (resourceId.startsWith(prefix)) {
                            const shortId = resourceId.substring(resourceId.length - 8);
                            const info = this.getResourceDetails(resourceId);
                            
                            return {
                                id: resourceId,
                                shortId: shortId,
                                prefix: prefix,
                                type: resourceType,
                                name: info ? info.name : null,
                                details: info ? info.details : null
                            };
                        }
                    }
                    
                    // No prefix match found, return as is
                    return { 
                        id: resourceId,
                        shortId: resourceId,
                        prefix: '',
                        type: 'Unknown',
                        name: null,
                        details: null
                    };
                },
                selectService: function(serviceId) {
                    this.currentService = serviceId;
                    this.resources = [];
                    this.loadResources();
                },
                getCurrentServiceName: function() {
                    // Check main services
                    const service = this.services.find(s => s.id === this.currentService);
                    if (service) {
                        return service.name;
                    }
                    
                    // Check submenus
                    for (const service of this.services) {
                        if (service.submenu) {
                            const subitem = service.submenu.find(si => si.id === this.currentService);
                            if (subitem) {
                                return subitem.name;
                            }
                        }
                    }
                    
                    return '';
                },
                loadResources: function() {
                    if (!this.isConnected) return;
                    
                    this.loading = true;
                    
                    // Example implementation for different services
                    switch(this.currentService) {
                        // EC2 Resource Types
                        case 'ec2_instances':
                            this.loadEC2Resources();
                            break;
                        case 'elastic_ips':
                            this.loadElasticIPResources();
                            break;
                        case 'ebs_volumes':
                            this.loadEBSVolumeResources();
                            break;
                        case 'network_interfaces':
                            this.loadNetworkInterfaceResources();
                            break;
                        case 'amis':
                            this.loadAMIResources();
                            break;
                        case 'security_groups':
                            this.loadSecurityGroupResources();
                            break;
                        case 'key_pairs':
                            this.loadKeyPairResources();
                            break;
                        // Other services
                        case 's3':
                            this.loadS3Resources();
                            break;
                        case 'rds':
                            this.loadRDSResources();
                            break;
                        case 'elasticache':
                            this.loadElastiCacheResources();
                            break;
                        case 'redis_clusters':
                            this.loadRedisClustersResources();
                            break;
                        case 'valkey_clusters':
                            this.loadValkeyClustersResources();
                            break;
                        case 'subnet_groups':
                            this.loadSubnetGroupsResources();
                            break;
                        case 'lambda':
                            this.loadLambdaResources();
                            break;
                        case 'vpcs':
                            this.loadVPCResources();
                            break;
                        case 'route_tables':
                            this.loadRouteTableResources();
                            break;
                        case 'subnets':
                            this.loadSubnetResources();
                            break;
                        case 'load_balancers':
                            this.loadLoadBalancerResources();
                            break;
                        case 'lb_listeners':
                            this.loadLBListenerResources();
                            break;
                        case 'lb_target_groups':
                            this.loadLBTargetGroupResources();
                            break;
                        default:
                            this.loading = false;
                            break;
                    }
                },
                loadEC2Resources: function() {
                    // Try to get from cache first
                    const cachedInstances = this.getResourcesFromCache('ec2_instances');
                    if (cachedInstances) {
                        this.resources = cachedInstances;
                        this.loading = false;
                        return;
                    }
                    
                    const ec2 = new AWS.EC2();
                    ec2.describeInstances({}, (err, data) => {
                        this.loading = false;
                        if (err) {
                            console.error("Error loading EC2 instances:", err);
                            return;
                        }
                        
                        const instances = [];
                        data.Reservations.forEach(reservation => {
                            reservation.Instances.forEach(instance => {
                                const name = instance.Tags ? instance.Tags.find(tag => tag.Key === 'Name')?.Value : 'Unnamed';
                                instances.push({
                                    id: instance.InstanceId,
                                    name: name || 'Unnamed',
                                    state: instance.State ? instance.State.Name : '',
                                    type: instance.InstanceType,
                                    az: instance.Placement ? instance.Placement.AvailabilityZone : '',
                                    publicIp: instance.PublicIpAddress || '-',
                                    privateIp: instance.PrivateIpAddress || '-',
                                    keyName: instance.KeyName || '-',
                                    launchTime: instance.LaunchTime,
                                    platform: instance.Platform,
                                    data: instance
                                });
                            });
                        });
                        
                        this.resources = instances;
                        
                        // Cache the results
                        this.cacheResources('ec2_instances', instances);
                        
                        // Update the in-memory resource map for instance tooltips
                        instances.forEach(instance => {
                            this.resourceMap[instance.id] = {
                                name: instance.name,
                                type: 'EC2 Instance',
                                details: `Type: ${instance.type}, State: ${instance.state}, IP: ${instance.privateIp}`
                            };
                        });
                        
                        // Update cached resources
                        this.cachedResources.instances = instances;
                    });
                },
                loadS3Resources: function() {
                    // Create S3 client with specific CORS settings
                    const s3 = new AWS.S3({
                        // Use path style addressing to avoid CORS issues with bucket-specific endpoints
                        s3ForcePathStyle: true,
                        // Set increased timeout for potentially slow S3 operations
                        httpOptions: {
                            timeout: 10000 // 10 seconds
                        }
                    });
                    
                    s3.listBuckets({}, (err, data) => {
                        if (err) {
                            this.loading = false;
                            console.error("Error loading S3 buckets:", err);
                            return;
                        }
                        
                        // Get basic bucket info - simplified to avoid CORS issues
                        const buckets = data.Buckets.map(bucket => ({
                            id: bucket.Name,
                            name: bucket.Name,
                            creationDate: bucket.CreationDate,
                            region: 'Fetching...',
                            accessControl: 'Fetching...',
                            publicStatus: 'Fetching...',
                            versioning: 'Fetching...',
                            encryption: 'Fetching...',
                            data: bucket
                        }));
                        
                        // Update resources immediately to show basic info
                        this.resources = buckets;
                        
                        // Process each bucket sequentially instead of in parallel to reduce CORS issues
                        const processBuckets = async () => {
                            for (let i = 0; i < buckets.length; i++) {
                                const bucket = buckets[i];
                                try {
                                    // Get bucket location (region)
                                    try {
                                        const locationData = await s3.getBucketLocation({ Bucket: bucket.id }).promise();
                                        // Convert empty string to us-east-1 (AWS default)
                                        bucket.region = locationData.LocationConstraint || 'us-east-1';
                                    } catch (e) {
                                        console.log(`Region error for ${bucket.id}:`, e);
                                        bucket.region = 'Unknown';
                                    }
                                    
                                    // Get versioning status - less likely to have CORS issues
                                    try {
                                        const versionData = await s3.getBucketVersioning({ Bucket: bucket.id }).promise();
                                        bucket.versioning = versionData.Status || 'Disabled';
                                    } catch (e) {
                                        console.log(`Versioning error for ${bucket.id}:`, e);
                                        bucket.versioning = 'Unknown';
                                    }
                                    
                                    // Update simplified values for other attributes
                                    bucket.accessControl = 'Check AWS Console';
                                    bucket.publicStatus = 'Check AWS Console';
                                    bucket.encryption = 'Check AWS Console';
                                    
                                    // Update the resource array to refresh the display
                                    this.resources = [...buckets];
                                    
                                } catch (e) {
                                    console.error(`Error processing bucket ${bucket.id}:`, e);
                                }
                            }
                            
                            this.loading = false;
                        };
                        
                        processBuckets();
                    });
                },
                loadRDSResources: function() {
                    // Ensure VPC cache is loaded first
                    const ensureVPCCache = () => {
                        if (this.cachedResources.vpcs.length === 0) {
                            const cachedVPCs = this.getResourcesFromCache('vpcs');
                            if (cachedVPCs && cachedVPCs.length > 0) {
                                this.cachedResources.vpcs = cachedVPCs;
                                
                                // Update resource map with VPCs for tooltips
                                cachedVPCs.forEach(vpc => {
                                    // Format multiple CIDR blocks if available
                                    const cidrDisplay = vpc.cidrBlocks && vpc.cidrBlocks.length > 1 
                                        ? vpc.cidrBlocks.join(', ')
                                        : vpc.cidr;
                                        
                                    this.resourceMap[vpc.id] = {
                                        name: vpc.name,
                                        type: 'VPC',
                                        details: `ID: ${vpc.id}${cidrDisplay ? '\nCIDR: ' + cidrDisplay : ''}`
                                    };
                                });
                                console.log("Loaded VPC cache for RDS:", cachedVPCs.length);
                            }
                        }
                    };
                    
                    // Make sure VPC cache is loaded
                    ensureVPCCache();
                    
                    const rds = new AWS.RDS();
                    rds.describeDBInstances({}, (err, data) => {
                        this.loading = false;
                        if (err) {
                            console.error("Error loading RDS instances:", err);
                            return;
                        }
                        
                        const instances = data.DBInstances.map(instance => {
                            // Get database engine and version
                            const engine = instance.Engine || 'Unknown';
                            const engineVersion = instance.EngineVersion || '';
                            const engineDisplay = `${engine} ${engineVersion}`;
                            
                            // Format storage information
                            const storage = `${instance.AllocatedStorage || 0} GB ${instance.StorageType || ''}`;
                            
                            // Get the VPC info
                            const vpcId = instance.DBSubnetGroup ? instance.DBSubnetGroup.VpcId : '-';
                            
                            // Find VPC name from cache
                            let vpcName = 'Unknown VPC';
                            if (vpcId !== '-') {
                                // Check if we have VPC details in the resource map
                                const vpcDetails = this.resourceMap[vpcId];
                                if (vpcDetails && vpcDetails.name) {
                                    vpcName = vpcDetails.name;
                                } else {
                                    // Look in the VPC cache
                                    const cachedVPC = this.cachedResources.vpcs.find(vpc => vpc.id === vpcId);
                                    if (cachedVPC) {
                                        vpcName = cachedVPC.name;
                                    } else {
                                        vpcName = vpcId; // Fallback to ID if name not found
                                    }
                                }
                            }
                            
                            return {
                                id: instance.DBInstanceIdentifier,
                                name: instance.DBInstanceArn.includes('name/') 
                                    ? instance.DBInstanceArn.split('name/')[1] 
                                    : instance.DBInstanceIdentifier,
                                engine: engineDisplay,
                                instanceClass: instance.DBInstanceClass || '-',
                                storage: storage,
                                vpcId: vpcId,
                                vpcName: vpcName,
                                region: this.region,
                                status: instance.DBInstanceStatus || '-',
                                endpoint: instance.Endpoint 
                                    ? `${instance.Endpoint.Address}:${instance.Endpoint.Port}` 
                                    : '-',
                                multiAZ: instance.MultiAZ ? 'Yes' : 'No',
                                encrypted: instance.StorageEncrypted ? 'Yes' : 'No',
                                data: instance
                            };
                        });
                        
                        // Load VPC information if not already cached
                        if (this.cachedResources.vpcs.length === 0) {
                            // Collect all unique VPC IDs
                            const vpcIds = [...new Set(instances
                                .map(instance => instance.vpcId)
                                .filter(id => id !== '-'))];
                                
                            if (vpcIds.length > 0) {
                                // Load VPC data
                                const ec2 = new AWS.EC2();
                                ec2.describeVpcs({ VpcIds: vpcIds }, (vpcErr, vpcData) => {
                                    if (!vpcErr && vpcData && vpcData.Vpcs) {
                                        const vpcs = vpcData.Vpcs.map(vpc => {
                                            const name = vpc.Tags ? vpc.Tags.find(tag => tag.Key === 'Name')?.Value : '';
                                            return {
                                                id: vpc.VpcId,
                                                name: name || vpc.VpcId,
                                                cidr: vpc.CidrBlock,
                                                cidrBlocks: [vpc.CidrBlock],
                                                state: vpc.State,
                                                isDefault: vpc.IsDefault ? 'Yes' : 'No',
                                                tenancy: vpc.InstanceTenancy,
                                                data: vpc
                                            };
                                        });
                                        
                                        // Update the instance VPC names
                                        instances.forEach(instance => {
                                            if (instance.vpcId !== '-') {
                                                const vpc = vpcs.find(vpc => vpc.id === instance.vpcId);
                                                if (vpc) {
                                                    instance.vpcName = vpc.name;
                                                    
                                                    // Update resource map
                                                    this.resourceMap[vpc.id] = {
                                                        name: vpc.name,
                                                        type: 'VPC',
                                                        details: `ID: ${vpc.id}\nCIDR: ${vpc.cidr}`
                                                    };
                                                }
                                            }
                                        });
                                        
                                        // Force UI update
                                        this.resources = [...instances];
                                    }
                                });
                            }
                        }
                        
                        this.resources = instances;
                    });
                },
                loadLambdaResources: function() {
                    const lambda = new AWS.Lambda();
                    lambda.listFunctions({}, (err, data) => {
                        this.loading = false;
                        if (err) {
                            console.error("Error loading Lambda functions:", err);
                            return;
                        }
                        
                        const functions = data.Functions.map(fn => ({
                            id: fn.FunctionName,
                            name: fn.FunctionName,
                            data: fn
                        }));
                        
                        this.resources = functions;
                    });
                },
                
                loadEBSVolumeResources: function() {
                    const ec2 = new AWS.EC2();
                    ec2.describeVolumes({}, (err, data) => {
                        if (err) {
                            this.loading = false;
                            console.error("Error loading EBS Volumes:", err);
                            return;
                        }
                        
                        // Collect all instance IDs that volumes are attached to
                        const instanceIds = new Set();
                        data.Volumes.forEach(volume => {
                            if (volume.Attachments && volume.Attachments.length > 0) {
                                volume.Attachments.forEach(attachment => {
                                    if (attachment.InstanceId) {
                                        instanceIds.add(attachment.InstanceId);
                                    }
                                });
                            }
                        });
                        
                        // Convert Set to Array
                        const instanceIdsArray = Array.from(instanceIds);
                        
                        // Process the volumes
                        const processVolumes = () => {
                            const volumes = data.Volumes.map(volume => {
                                const name = volume.Tags ? volume.Tags.find(tag => tag.Key === 'Name')?.Value : '';
                                const attachedInstanceId = volume.Attachments && volume.Attachments.length > 0 ? 
                                    volume.Attachments[0].InstanceId : '-';
                                    
                                return {
                                    id: volume.VolumeId,
                                    name: name || volume.VolumeId,
                                    size: volume.Size + ' GB',
                                    type: volume.VolumeType,
                                    state: volume.State,
                                    az: volume.AvailabilityZone,
                                    instanceId: attachedInstanceId,
                                    data: volume
                                };
                            });
                            
                            this.resources = volumes;
                            this.loading = false;
                        };
                        
                        // If there are attached instances, fetch their details for the tooltips
                        if (instanceIdsArray.length > 0) {
                            // First check if we already have instance details in our resource map
                            const uncachedInstanceIds = instanceIdsArray.filter(id => !this.resourceMap[id]);
                            
                            if (uncachedInstanceIds.length > 0) {
                                // Fetch details for instances we don't have cached
                                ec2.describeInstances({ InstanceIds: uncachedInstanceIds }, (instanceErr, instanceData) => {
                                    if (!instanceErr && instanceData && instanceData.Reservations) {
                                        instanceData.Reservations.forEach(reservation => {
                                            reservation.Instances.forEach(instance => {
                                                const name = instance.Tags ? instance.Tags.find(tag => tag.Key === 'Name')?.Value : 'Unnamed';
                                                
                                                // Add to resource map
                                                this.resourceMap[instance.InstanceId] = {
                                                    name: name || 'Unnamed',
                                                    type: 'EC2 Instance',
                                                    details: `ID: ${instance.InstanceId}\nType: ${instance.InstanceType}\nState: ${instance.State ? instance.State.Name : 'Unknown'}`
                                                };
                                            });
                                        });
                                    }
                                    
                                    // Process volumes after getting instance details
                                    processVolumes();
                                });
                            } else {
                                // All instance details are already cached
                                processVolumes();
                            }
                        } else {
                            // No instances to look up
                            processVolumes();
                        }
                    });
                },
                loadVPCResources: function() {
                    // Try to get from cache first
                    const cachedVPCs = this.getResourcesFromCache('vpcs');
                    if (cachedVPCs) {
                        this.resources = cachedVPCs;
                        this.loading = false;
                        return;
                    }
                    
                    const ec2 = new AWS.EC2();
                    
                    // First get the VPCs with their main CIDR blocks
                    ec2.describeVpcs({}, (err, data) => {
                        this.loading = false;
                        if (err) {
                            console.error("Error loading VPC resources:", err);
                            return;
                        }
                        
                        const vpcs = data.Vpcs.map(vpc => {
                            const name = vpc.Tags ? vpc.Tags.find(tag => tag.Key === 'Name')?.Value : 'Unnamed';
                            return {
                                id: vpc.VpcId,
                                name: name || 'Unnamed',
                                cidr: vpc.CidrBlock,
                                cidrBlocks: [vpc.CidrBlock], // Initialize with primary CIDR
                                state: vpc.State,
                                isDefault: vpc.IsDefault ? 'Yes' : 'No',
                                tenancy: vpc.InstanceTenancy,
                                data: vpc
                            };
                        });
                        
                        // Now get any additional IPv4 CIDR blocks
                        Promise.all(vpcs.map(vpc => {
                            return new Promise((resolve) => {
                                // Use describeVpcs with filters instead of describeVpcCidrBlocks (which doesn't exist)
                                ec2.describeVpcs({ VpcIds: [vpc.id] }, (err, data) => {
                                    if (!err && data && data.Vpcs && data.Vpcs[0]) {
                                        // Get all CIDR associations
                                        const vpcData = data.Vpcs[0];
                                        
                                        if (vpcData.CidrBlockAssociationSet) {
                                            // Filter to only associated CIDR blocks
                                            const additionalCidrs = vpcData.CidrBlockAssociationSet
                                                .filter(cidr => cidr.CidrBlockState && cidr.CidrBlockState.State === 'associated')
                                                .map(cidr => cidr.CidrBlock);
                                            
                                            // Add additional CIDRs that aren't already in the list
                                            additionalCidrs.forEach(cidr => {
                                                if (!vpc.cidrBlocks.includes(cidr)) {
                                                    vpc.cidrBlocks.push(cidr);
                                                }
                                            });
                                        }
                                    }
                                    resolve();
                                });
                            });
                        })).finally(() => {
                            this.resources = vpcs;
                            
                            // Cache the results
                            this.cacheResources('vpcs', vpcs);
                            
                            // Update the in-memory resource map
                            vpcs.forEach(vpc => {
                                // Format multiple CIDR blocks nicely
                                const cidrDisplay = vpc.cidrBlocks.length > 1 
                                    ? vpc.cidrBlocks.join(', ')
                                    : vpc.cidr;
                                
                                this.resourceMap[vpc.id] = {
                                    name: vpc.name,
                                    type: 'VPC',
                                    details: `ID: ${vpc.id}${vpc.cidrBlocks.length > 0 ? '\nCIDR: ' + cidrDisplay : ''}`
                                };
                            });
                            
                            // Update cached resources
                            this.cachedResources.vpcs = vpcs;
                        });
                    });
                },
                
                loadRouteTableResources: function() {
                    const ec2 = new AWS.EC2();
                    ec2.describeRouteTables({}, (err, data) => {
                        this.loading = false;
                        if (err) {
                            console.error("Error loading Route Tables:", err);
                            return;
                        }
                        
                        const routeTables = data.RouteTables.map(rt => {
                            const name = rt.Tags ? rt.Tags.find(tag => tag.Key === 'Name')?.Value : '';
                            const vpcId = rt.VpcId;
                            const routeCount = rt.Routes ? rt.Routes.length : 0;
                            const associationCount = rt.Associations ? rt.Associations.length : 0;
                            const isMain = rt.Associations ? rt.Associations.some(assoc => assoc.Main === true) : false;
                            
                            return {
                                id: rt.RouteTableId,
                                name: name || rt.RouteTableId,
                                vpcId: vpcId,
                                routeCount: routeCount,
                                associationCount: associationCount,
                                isMain: isMain ? 'Yes' : 'No',
                                data: rt
                            };
                        });
                        
                        this.resources = routeTables;
                    });
                },
                
                loadSubnetResources: function() {
                    // Try to get from cache first
                    const cachedSubnets = this.getResourcesFromCache('subnets');
                    if (cachedSubnets) {
                        this.resources = cachedSubnets;
                        this.loading = false;
                        return;
                    }
                    
                    const ec2 = new AWS.EC2();
                    ec2.describeSubnets({}, (err, data) => {
                        this.loading = false;
                        if (err) {
                            console.error("Error loading Subnets:", err);
                            return;
                        }
                        
                        const subnets = data.Subnets.map(subnet => {
                            const name = subnet.Tags ? subnet.Tags.find(tag => tag.Key === 'Name')?.Value : '';
                            
                            return {
                                id: subnet.SubnetId,
                                name: name || subnet.SubnetId,
                                vpcId: subnet.VpcId,
                                cidr: subnet.CidrBlock,
                                az: subnet.AvailabilityZone,
                                availableIpCount: subnet.AvailableIpAddressCount,
                                state: subnet.State,
                                public: subnet.MapPublicIpOnLaunch ? 'Yes' : 'No',
                                data: subnet
                            };
                        });
                        
                        this.resources = subnets;
                        
                        // Cache the results
                        this.cacheResources('subnets', subnets);
                        
                        // Update the in-memory resource map
                        subnets.forEach(subnet => {
                            this.resourceMap[subnet.id] = {
                                name: subnet.name,
                                type: 'Subnet',
                                details: `ID: ${subnet.id}, CIDR: ${subnet.cidr}, AZ: ${subnet.az}`
                            };
                        });
                        
                        // Update cached resources
                        this.cachedResources.subnets = subnets;
                    });
                },
                
                loadLoadBalancerResources: function() {
                    // Ensure VPC cache is loaded first
                    const ensureVPCCache = () => {
                        if (this.cachedResources.vpcs.length === 0) {
                            const cachedVPCs = this.getResourcesFromCache('vpcs');
                            if (cachedVPCs && cachedVPCs.length > 0) {
                                this.cachedResources.vpcs = cachedVPCs;
                                
                                // Update resource map with VPCs for tooltips
                                cachedVPCs.forEach(vpc => {
                                    // Format multiple CIDR blocks if available
                                    const cidrDisplay = vpc.cidrBlocks && vpc.cidrBlocks.length > 1 
                                        ? vpc.cidrBlocks.join(', ')
                                        : vpc.cidr;
                                        
                                    this.resourceMap[vpc.id] = {
                                        name: vpc.name,
                                        type: 'VPC',
                                        details: `ID: ${vpc.id}${cidrDisplay ? '\nCIDR: ' + cidrDisplay : ''}`
                                    };
                                });
                                console.log("Loaded VPC cache for Load Balancers:", cachedVPCs.length);
                            }
                        }
                    };
                    
                    // Make sure VPC cache is loaded
                    ensureVPCCache();
                    
                    const elbv2 = new AWS.ELBv2();
                    elbv2.describeLoadBalancers({}, (err, data) => {
                        this.loading = false;
                        if (err) {
                            console.error("Error loading Load Balancers:", err);
                            return;
                        }
                        
                        // Get basic info about load balancers
                        const loadBalancers = data.LoadBalancers.map(lb => {
                            // Find VPC name from cache
                            let vpcName = 'Unknown VPC';
                            if (lb.VpcId) {
                                // Check if we have VPC details in the resource map
                                const vpcDetails = this.resourceMap[lb.VpcId];
                                if (vpcDetails && vpcDetails.name) {
                                    vpcName = vpcDetails.name;
                                } else {
                                    // Look in the VPC cache
                                    const cachedVPC = this.cachedResources.vpcs.find(vpc => vpc.id === lb.VpcId);
                                    if (cachedVPC) {
                                        vpcName = cachedVPC.name;
                                    } else {
                                        vpcName = lb.VpcId; // Fallback to ID if name not found
                                    }
                                }
                            }
                            
                            const lbInfo = {
                                id: lb.LoadBalancerArn,
                                name: lb.LoadBalancerName,
                                dnsName: lb.DNSName,
                                type: lb.Type,
                                scheme: lb.Scheme || '-',
                                vpcId: lb.VpcId,
                                vpcName: vpcName,
                                state: lb.State ? lb.State.Code : '-',
                                createdTime: lb.CreatedTime,
                                data: lb
                            };
                            
                            return lbInfo;
                        });
                        
                        // Collect all unique VPC IDs
                        const vpcIds = [...new Set(loadBalancers
                            .map(lb => lb.vpcId)
                            .filter(id => id))];
                            
                        // Get tags for all load balancers (if any)
                        if (loadBalancers.length > 0) {
                            const lbArns = loadBalancers.map(lb => lb.id);
                            
                            elbv2.describeTags({ ResourceArns: lbArns }, (err, tagData) => {
                                if (!err && tagData && tagData.TagDescriptions) {
                                    tagData.TagDescriptions.forEach(tagDesc => {
                                        const lb = loadBalancers.find(loadBalancer => loadBalancer.id === tagDesc.ResourceArn);
                                        if (lb && tagDesc.Tags) {
                                            const nameTag = tagDesc.Tags.find(tag => tag.Key === 'Name');
                                            if (nameTag) {
                                                lb.name = nameTag.Value;
                                            }
                                        }
                                    });
                                }
                                
                                // Load VPC information if not already cached
                                if (this.cachedResources.vpcs.length === 0 && vpcIds.length > 0) {
                                    // Load VPC data
                                    const ec2 = new AWS.EC2();
                                    ec2.describeVpcs({ VpcIds: vpcIds }, (vpcErr, vpcData) => {
                                        if (!vpcErr && vpcData && vpcData.Vpcs) {
                                            const vpcs = vpcData.Vpcs.map(vpc => {
                                                const name = vpc.Tags ? vpc.Tags.find(tag => tag.Key === 'Name')?.Value : '';
                                                return {
                                                    id: vpc.VpcId,
                                                    name: name || vpc.VpcId,
                                                    cidr: vpc.CidrBlock,
                                                    cidrBlocks: [vpc.CidrBlock],
                                                    state: vpc.State,
                                                    isDefault: vpc.IsDefault ? 'Yes' : 'No',
                                                    tenancy: vpc.InstanceTenancy,
                                                    data: vpc
                                                };
                                            });
                                            
                                            // Update the load balancer VPC names
                                            loadBalancers.forEach(lb => {
                                                if (lb.vpcId) {
                                                    const vpc = vpcs.find(vpc => vpc.id === lb.vpcId);
                                                    if (vpc) {
                                                        lb.vpcName = vpc.name;
                                                        
                                                        // Update resource map
                                                        this.resourceMap[vpc.id] = {
                                                            name: vpc.name,
                                                            type: 'VPC',
                                                            details: `ID: ${vpc.id}\nCIDR: ${vpc.cidr}`
                                                        };
                                                    }
                                                }
                                            });
                                            
                                            // Force UI update
                                            this.resources = [...loadBalancers];
                                        }
                                    });
                                }
                                
                                this.resources = loadBalancers;
                            });
                        } else {
                            this.resources = loadBalancers;
                        }
                    });
                },
                
                loadLBListenerResources: function() {
                    const elbv2 = new AWS.ELBv2();
                    
                    // First, get all load balancers to associate listeners with their load balancers
                    elbv2.describeLoadBalancers({}, (err, lbData) => {
                        if (err) {
                            this.loading = false;
                            console.error("Error loading Load Balancers for Listeners:", err);
                            return;
                        }
                        
                        const loadBalancers = lbData.LoadBalancers;
                        const loadBalancerMap = {};
                        loadBalancers.forEach(lb => {
                            loadBalancerMap[lb.LoadBalancerArn] = lb.LoadBalancerName;
                        });
                        
                        // Use Promise.all to get listeners for all load balancers
                        Promise.all(loadBalancers.map(lb => {
                            return new Promise((resolve) => {
                                elbv2.describeListeners({ LoadBalancerArn: lb.LoadBalancerArn }, (err, data) => {
                                    if (err || !data.Listeners) {
                                        console.error(`Error loading listeners for ${lb.LoadBalancerName}:`, err);
                                        resolve([]);
                                        return;
                                    }
                                    
                                    // Format listener data
                                    const listeners = data.Listeners.map(listener => {
                                        // Parse default actions for display
                                        let defaultAction = 'Unknown';
                                        if (listener.DefaultActions && listener.DefaultActions.length > 0) {
                                            const action = listener.DefaultActions[0];
                                            if (action.Type === 'forward' && action.TargetGroupArn) {
                                                // Extract target group name from ARN
                                                const tgName = action.TargetGroupArn.split('/')[1] || action.TargetGroupArn;
                                                defaultAction = `Forward to ${tgName}`;
                                            } else {
                                                defaultAction = action.Type;
                                            }
                                        }
                                        
                                        return {
                                            id: listener.ListenerArn,
                                            name: `${lb.LoadBalancerName}-${listener.Protocol}-${listener.Port}`,
                                            lbName: lb.LoadBalancerName,
                                            lbArn: lb.LoadBalancerArn,
                                            protocol: listener.Protocol,
                                            port: listener.Port,
                                            defaultAction: defaultAction,
                                            sslPolicy: listener.SslPolicy || '-',
                                            data: listener
                                        };
                                    });
                                    
                                    resolve(listeners);
                                });
                            });
                        }))
                        .then(listenersArrays => {
                            // Flatten array of arrays
                            const allListeners = [].concat(...listenersArrays);
                            this.resources = allListeners;
                            this.loading = false;
                        })
                        .catch(error => {
                            console.error("Error processing listeners:", error);
                            this.resources = [];
                            this.loading = false;
                        });
                    });
                },
                
                loadLBTargetGroupResources: function() {
                    // Ensure VPC cache is loaded first
                    const ensureVPCCache = () => {
                        if (this.cachedResources.vpcs.length === 0) {
                            const cachedVPCs = this.getResourcesFromCache('vpcs');
                            if (cachedVPCs && cachedVPCs.length > 0) {
                                this.cachedResources.vpcs = cachedVPCs;
                                
                                // Update resource map with VPCs for tooltips
                                cachedVPCs.forEach(vpc => {
                                    // Format multiple CIDR blocks if available
                                    const cidrDisplay = vpc.cidrBlocks && vpc.cidrBlocks.length > 1 
                                        ? vpc.cidrBlocks.join(', ')
                                        : vpc.cidr;
                                        
                                    this.resourceMap[vpc.id] = {
                                        name: vpc.name,
                                        type: 'VPC',
                                        details: `ID: ${vpc.id}${cidrDisplay ? '\nCIDR: ' + cidrDisplay : ''}`
                                    };
                                });
                                console.log("Loaded VPC cache for Target Groups:", cachedVPCs.length);
                            }
                        }
                    };
                    
                    // Make sure VPC cache is loaded
                    ensureVPCCache();
                
                    const elbv2 = new AWS.ELBv2();
                    
                    elbv2.describeTargetGroups({}, (err, data) => {
                        if (err) {
                            this.loading = false;
                            console.error("Error loading Target Groups:", err);
                            return;
                        }
                        
                        const targetGroups = data.TargetGroups.map(tg => {
                            // Find VPC name from cache
                            let vpcName = 'Unknown VPC';
                            if (tg.VpcId) {
                                // Check if we have VPC details in the resource map
                                const vpcDetails = this.resourceMap[tg.VpcId];
                                if (vpcDetails && vpcDetails.name) {
                                    vpcName = vpcDetails.name;
                                } else {
                                    // Look in the VPC cache
                                    const cachedVPC = this.cachedResources.vpcs.find(vpc => vpc.id === tg.VpcId);
                                    if (cachedVPC) {
                                        vpcName = cachedVPC.name;
                                    } else {
                                        vpcName = tg.VpcId; // Fallback to ID if name not found
                                    }
                                }
                            }
                            
                            return {
                                id: tg.TargetGroupArn,
                                name: tg.TargetGroupName,
                                targetType: tg.TargetType || 'instance',
                                protocol: tg.Protocol,
                                port: tg.Port,
                                vpcId: tg.VpcId,
                                vpcName: vpcName,
                                healthCheckPath: tg.HealthCheckPath || '/',
                                healthCheckProtocol: tg.HealthCheckProtocol,
                                healthCheckPort: tg.HealthCheckPort,
                                targetCount: '-', // Will be filled in later
                                data: tg
                            };
                        });
                        
                        // Get health status and count of targets for each target group
                        Promise.all(targetGroups.map(tg => {
                            return new Promise((resolve) => {
                                elbv2.describeTargetHealth({ TargetGroupArn: tg.id }, (err, targetData) => {
                                    if (!err && targetData && targetData.TargetHealthDescriptions) {
                                        tg.targetCount = targetData.TargetHealthDescriptions.length;
                                        
                                        // Count healthy targets
                                        const healthyCount = targetData.TargetHealthDescriptions.filter(
                                            target => target.TargetHealth && target.TargetHealth.State === 'healthy'
                                        ).length;
                                        
                                        tg.healthStatus = `${healthyCount}/${tg.targetCount} healthy`;
                                    }
                                    resolve();
                                });
                            });
                        }))
                        .finally(() => {
                            // Collect all unique VPC IDs
                            const vpcIds = [...new Set(targetGroups
                                .map(tg => tg.vpcId)
                                .filter(id => id))];
                                
                            // Load VPC information if not already cached
                            if (this.cachedResources.vpcs.length === 0 && vpcIds.length > 0) {
                                // Load VPC data
                                const ec2 = new AWS.EC2();
                                ec2.describeVpcs({ VpcIds: vpcIds }, (vpcErr, vpcData) => {
                                    if (!vpcErr && vpcData && vpcData.Vpcs) {
                                        const vpcs = vpcData.Vpcs.map(vpc => {
                                            const name = vpc.Tags ? vpc.Tags.find(tag => tag.Key === 'Name')?.Value : '';
                                            return {
                                                id: vpc.VpcId,
                                                name: name || vpc.VpcId,
                                                cidr: vpc.CidrBlock,
                                                cidrBlocks: [vpc.CidrBlock],
                                                state: vpc.State,
                                                isDefault: vpc.IsDefault ? 'Yes' : 'No',
                                                tenancy: vpc.InstanceTenancy,
                                                data: vpc
                                            };
                                        });
                                        
                                        // Update the target group VPC names
                                        targetGroups.forEach(tg => {
                                            if (tg.vpcId) {
                                                const vpc = vpcs.find(vpc => vpc.id === tg.vpcId);
                                                if (vpc) {
                                                    tg.vpcName = vpc.name;
                                                    
                                                    // Update resource map
                                                    this.resourceMap[vpc.id] = {
                                                        name: vpc.name,
                                                        type: 'VPC',
                                                        details: `ID: ${vpc.id}\nCIDR: ${vpc.cidr}`
                                                    };
                                                }
                                            }
                                        });
                                        
                                        // Force UI update
                                        this.resources = [...targetGroups];
                                    }
                                });
                            }
                            
                            this.resources = targetGroups;
                            this.loading = false;
                        });
                    });
                },
                loadElasticIPResources: function() {
                    const ec2 = new AWS.EC2();
                    ec2.describeAddresses({}, (err, data) => {
                        this.loading = false;
                        if (err) {
                            console.error("Error loading Elastic IPs:", err);
                            return;
                        }
                        
                        const eips = data.Addresses.map(eip => {
                            const name = eip.Tags ? eip.Tags.find(tag => tag.Key === 'Name')?.Value : '';
                            return {
                                id: eip.AllocationId || eip.PublicIp,
                                name: name || eip.PublicIp,
                                publicIp: eip.PublicIp,
                                privateIp: eip.PrivateIpAddress || '-',
                                instanceId: eip.InstanceId || '-',
                                domain: eip.Domain,
                                data: eip
                            };
                        });
                        
                        this.resources = eips;
                    });
                },
                loadEBSVolumeResources: function() {
                    // Ensure instance cache is loaded first
                    const ensureInstanceCache = () => {
                        // If instance cache is empty, try loading from localStorage
                        if (this.cachedResources.instances.length === 0) {
                            const cachedInstances = this.getResourcesFromCache('ec2_instances');
                            if (cachedInstances && cachedInstances.length > 0) {
                                this.cachedResources.instances = cachedInstances;
                                
                                // Update resource map with instances for tooltips
                                cachedInstances.forEach(instance => {
                                    this.resourceMap[instance.id] = {
                                        name: instance.name,
                                        type: 'EC2 Instance',
                                        details: `Type: ${instance.type}, State: ${instance.state}, IP: ${instance.privateIp}`
                                    };
                                });
                                console.log("Loaded instance cache from localStorage:", cachedInstances.length);
                            } else {
                                console.log("No instance cache found in localStorage");
                            }
                        }
                    };
                    
                    // Make sure instance cache is loaded
                    ensureInstanceCache();
                    
                    const ec2 = new AWS.EC2();
                    ec2.describeVolumes({}, (err, data) => {
                        if (err) {
                            this.loading = false;
                            console.error("Error loading EBS Volumes:", err);
                            return;
                        }
                        
                        // Collect all instance IDs that volumes are attached to
                        const instanceIds = new Set();
                        data.Volumes.forEach(volume => {
                            if (volume.Attachments && volume.Attachments.length > 0) {
                                volume.Attachments.forEach(attachment => {
                                    if (attachment.InstanceId) {
                                        instanceIds.add(attachment.InstanceId);
                                    }
                                });
                            }
                        });
                        
                        // Convert Set to Array
                        const instanceIdsArray = Array.from(instanceIds);
                        
                        // Process the volumes
                        const processVolumes = () => {
                            const volumes = data.Volumes.map(volume => {
                                const name = volume.Tags ? volume.Tags.find(tag => tag.Key === 'Name')?.Value : '';
                                const attachedInstanceId = volume.Attachments && volume.Attachments.length > 0 ? 
                                    volume.Attachments[0].InstanceId : '-';
                                    
                                return {
                                    id: volume.VolumeId,
                                    name: name || volume.VolumeId,
                                    size: volume.Size + ' GB',
                                    type: volume.VolumeType,
                                    state: volume.State,
                                    az: volume.AvailabilityZone,
                                    instanceId: attachedInstanceId,
                                    data: volume
                                };
                            });
                            
                            this.resources = volumes;
                            this.loading = false;
                        };
                        
                        // If there are attached instances, fetch their details for the tooltips
                        if (instanceIdsArray.length > 0) {
                            // Check which instances are not in the cache
                            const uncachedInstanceIds = instanceIdsArray.filter(id => !this.resourceMap[id]);
                            
                            if (uncachedInstanceIds.length > 0) {
                                // Fetch details for instances we don't have cached
                                console.log(`Fetching details for ${uncachedInstanceIds.length} uncached instances`);
                                ec2.describeInstances({ InstanceIds: uncachedInstanceIds }, (instanceErr, instanceData) => {
                                    if (!instanceErr && instanceData && instanceData.Reservations) {
                                        instanceData.Reservations.forEach(reservation => {
                                            reservation.Instances.forEach(instance => {
                                                const name = instance.Tags ? instance.Tags.find(tag => tag.Key === 'Name')?.Value : 'Unnamed';
                                                
                                                // Add to resource map
                                                this.resourceMap[instance.InstanceId] = {
                                                    name: name || 'Unnamed',
                                                    type: 'EC2 Instance',
                                                    details: `ID: ${instance.InstanceId}\nType: ${instance.InstanceType}\nState: ${instance.State ? instance.State.Name : 'Unknown'}`
                                                };
                                            });
                                        });
                                    }
                                    
                                    // Process volumes after getting instance details
                                    processVolumes();
                                });
                            } else {
                                // All instance details are already cached
                                console.log("All instance details already in cache");
                                processVolumes();
                            }
                        } else {
                            // No instances to look up
                            processVolumes();
                        }
                    });
                },
                loadNetworkInterfaceResources: function() {
                    // Ensure instance cache is loaded first, same as with EBS volumes
                    const ensureInstanceCache = () => {
                        if (this.cachedResources.instances.length === 0) {
                            const cachedInstances = this.getResourcesFromCache('ec2_instances');
                            if (cachedInstances && cachedInstances.length > 0) {
                                this.cachedResources.instances = cachedInstances;
                                
                                cachedInstances.forEach(instance => {
                                    this.resourceMap[instance.id] = {
                                        name: instance.name,
                                        type: 'EC2 Instance',
                                        details: `Type: ${instance.type}, State: ${instance.state}, IP: ${instance.privateIp}`
                                    };
                                });
                                console.log("Loaded instance cache for network interfaces:", cachedInstances.length);
                            }
                        }
                    };
                    
                    // Make sure instance cache is loaded
                    ensureInstanceCache();
                    
                    const ec2 = new AWS.EC2();
                    ec2.describeNetworkInterfaces({}, (err, data) => {
                        if (err) {
                            this.loading = false;
                            console.error("Error loading Network Interfaces:", err);
                            return;
                        }
                        
                        // Collect all instance IDs that interfaces are attached to
                        const instanceIds = new Set();
                        data.NetworkInterfaces.forEach(ni => {
                            if (ni.Attachment && ni.Attachment.InstanceId) {
                                instanceIds.add(ni.Attachment.InstanceId);
                            }
                        });
                        
                        // Convert Set to Array
                        const instanceIdsArray = Array.from(instanceIds);
                        
                        // Process the interfaces
                        const processInterfaces = () => {
                            const interfaces = data.NetworkInterfaces.map(ni => {
                                const name = ni.TagSet ? ni.TagSet.find(tag => tag.Key === 'Name')?.Value : '';
                                return {
                                    id: ni.NetworkInterfaceId,
                                    name: name || ni.NetworkInterfaceId,
                                    privateIp: ni.PrivateIpAddress,
                                    publicIp: ni.Association ? ni.Association.PublicIp : '-',
                                    subnetId: ni.SubnetId,
                                    vpcId: ni.VpcId,
                                    status: ni.Status,
                                    instanceId: ni.Attachment ? ni.Attachment.InstanceId : '-',
                                    data: ni
                                };
                            });
                            
                            this.resources = interfaces;
                            this.loading = false;
                        };
                        
                        // If there are attached instances, fetch their details for tooltips
                        if (instanceIdsArray.length > 0) {
                            // Check which instances are not in the cache
                            const uncachedInstanceIds = instanceIdsArray.filter(id => !this.resourceMap[id]);
                            
                            if (uncachedInstanceIds.length > 0) {
                                // Fetch details for instances we don't have cached
                                console.log(`Fetching details for ${uncachedInstanceIds.length} uncached instances for network interfaces`);
                                ec2.describeInstances({ InstanceIds: uncachedInstanceIds }, (instanceErr, instanceData) => {
                                    if (!instanceErr && instanceData && instanceData.Reservations) {
                                        instanceData.Reservations.forEach(reservation => {
                                            reservation.Instances.forEach(instance => {
                                                const name = instance.Tags ? instance.Tags.find(tag => tag.Key === 'Name')?.Value : 'Unnamed';
                                                
                                                // Add to resource map
                                                this.resourceMap[instance.InstanceId] = {
                                                    name: name || 'Unnamed',
                                                    type: 'EC2 Instance',
                                                    details: `ID: ${instance.InstanceId}\nType: ${instance.InstanceType}\nState: ${instance.State ? instance.State.Name : 'Unknown'}`
                                                };
                                            });
                                        });
                                    }
                                    
                                    // Process interfaces after getting instance details
                                    processInterfaces();
                                });
                            } else {
                                // All instance details are already cached
                                console.log("All instance details already in cache for network interfaces");
                                processInterfaces();
                            }
                        } else {
                            // No instances to look up
                            processInterfaces();
                        }
                    });
                },
                loadAMIResources: function() {
                    const ec2 = new AWS.EC2();
                    ec2.describeImages({Owners: ['self']}, (err, data) => {
                        this.loading = false;
                        if (err) {
                            console.error("Error loading AMIs:", err);
                            return;
                        }
                        
                        const amis = data.Images.map(image => {
                            const name = image.Tags ? image.Tags.find(tag => tag.Key === 'Name')?.Value : '';
                            return {
                                id: image.ImageId,
                                name: name || image.Name || image.ImageId,
                                platform: image.Platform || 'Linux/Unix',
                                architecture: image.Architecture,
                                state: image.State,
                                createdAt: image.CreationDate,
                                description: image.Description || '-',
                                data: image
                            };
                        });
                        
                        this.resources = amis;
                    });
                },
                loadSecurityGroupResources: function() {
                    const ec2 = new AWS.EC2();
                    ec2.describeSecurityGroups({}, (err, data) => {
                        this.loading = false;
                        if (err) {
                            console.error("Error loading Security Groups:", err);
                            return;
                        }
                        
                        const groups = data.SecurityGroups.map(group => {
                            return {
                                id: group.GroupId,
                                name: group.GroupName,
                                description: group.Description,
                                vpcId: group.VpcId,
                                ingressRulesCount: group.IpPermissions.length,
                                egressRulesCount: group.IpPermissionsEgress.length,
                                data: group
                            };
                        });
                        
                        this.resources = groups;
                    });
                },
                loadKeyPairResources: function() {
                    const ec2 = new AWS.EC2();
                    ec2.describeKeyPairs({}, (err, data) => {
                        this.loading = false;
                        if (err) {
                            console.error("Error loading Key Pairs:", err);
                            return;
                        }
                        
                        const keyPairs = data.KeyPairs.map(keyPair => {
                            return {
                                id: keyPair.KeyPairId,
                                name: keyPair.KeyName,
                                fingerprint: keyPair.KeyFingerprint,
                                keyType: keyPair.KeyType || 'rsa',
                                data: keyPair
                            };
                        });
                        
                        this.resources = keyPairs;
                    });
                },
                exportToTerraform: function() {
                    // Create a modal for Terraform export options
                    this.showExportModal = true;
                    this.exportSelectedResources = this.filteredResources.map(resource => ({ ...resource, selected: true }));
                    this.exportOptions = {
                        includeState: true,
                        includeProviders: true,
                        useModules: false,
                        includeComments: true
                    };
                },
                
                generateTerraformCode: function() {
                    // Get selected resources
                    const selectedResources = this.exportSelectedResources.filter(r => r.selected);
                    
                    if (selectedResources.length === 0) {
                        alert('Please select at least one resource to export.');
                        return;
                    }
                    
                    // Start building Terraform code
                    let terraformCode = '';
                    
                    // Add provider configuration
                    if (this.exportOptions.includeProviders) {
                        terraformCode += `# AWS Provider Configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = "${this.region}"
}

`;
                    }
                    
                    // Generate code for each resource type
                    switch(this.currentService) {
                        case 'ec2_instances':
                            terraformCode += this.generateEC2InstancesTerraform(selectedResources);
                            break;
                        case 'vpcs':
                            terraformCode += this.generateVPCTerraform(selectedResources);
                            break;
                        case 'subnets':
                            terraformCode += this.generateSubnetTerraform(selectedResources);
                            break;
                        case 'security_groups':
                            terraformCode += this.generateSecurityGroupTerraform(selectedResources);
                            break;
                        case 'ebs_volumes':
                            terraformCode += this.generateEBSVolumeTerraform(selectedResources);
                            break;
                        case 's3':
                            terraformCode += this.generateS3BucketTerraform(selectedResources);
                            break;
                        case 'route_tables':
                            terraformCode += this.generateRouteTableTerraform(selectedResources);
                            break;
                        case 'load_balancers':
                            terraformCode += this.generateLoadBalancerTerraform(selectedResources);
                            break;
                        case 'lb_target_groups':
                            terraformCode += this.generateTargetGroupTerraform(selectedResources);
                            break;
                        case 'lb_listeners':
                            terraformCode += this.generateListenerTerraform(selectedResources);
                            break;
                        case 'network_interfaces':
                            terraformCode += this.generateNetworkInterfaceTerraform(selectedResources);
                            break;
                        case 'elastic_ips':
                            terraformCode += this.generateElasticIPTerraform(selectedResources);
                            break;
                        default:
                            terraformCode += `# Export for ${this.currentService} is not yet implemented\n`;
                    }
                    
                    // Create blob and trigger download
                    const blob = new Blob([terraformCode], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    
                    // Create a download link
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${this.currentService}_terraform.tf`;
                    a.click();
                    
                    // Clean up
                    URL.revokeObjectURL(url);
                    this.showExportModal = false;
                },
                
                // Individual resource type Terraform generators
                generateEC2InstancesTerraform: function(resources) {
                    let code = '';
                    resources.forEach(instance => {
                        // Get instance name for resource name
                        const resourceName = this.sanitizeResourceName(instance.name);
                        
                        if (this.exportOptions.includeComments) {
                            code += `# EC2 Instance: ${instance.name} (${instance.id})\n`;
                        }
                        
                        code += `resource "aws_instance" "${resourceName}" {
  ami           = "${instance.data.ImageId}"
  instance_type = "${instance.type}"
`;

                        // Add availability zone if present
                        if (instance.az) {
                            code += `  availability_zone = "${instance.az}"\n`;
                        }
                        
                        // Add key name if present
                        if (instance.keyName && instance.keyName !== '-') {
                            code += `  key_name = "${instance.keyName}"\n`;
                        }
                        
                        // Add subnet if present
                        if (instance.data.SubnetId) {
                            code += `  subnet_id = "${instance.data.SubnetId}"\n`;
                        }
                        
                        // Add security groups if present
                        if (instance.data.SecurityGroups && instance.data.SecurityGroups.length > 0) {
                            code += `  security_groups = [\n`;
                            instance.data.SecurityGroups.forEach(sg => {
                                code += `    "${sg.GroupId}",\n`;
                            });
                            code += `  ]\n`;
                        }
                        
                        // Add tags including Name
                        if (instance.name) {
                            code += `  tags = {\n`;
                            code += `    Name = "${instance.name}"\n`;
                            
                            // Add additional tags if present
                            if (instance.data.Tags) {
                                instance.data.Tags.forEach(tag => {
                                    if (tag.Key !== 'Name') {
                                        code += `    ${tag.Key} = "${tag.Value}"\n`;
                                    }
                                });
                            }
                            
                            code += `  }\n`;
                        }
                        
                        code += `}\n\n`;
                    });
                    
                    return code;
                },
                
                generateVPCTerraform: function(resources) {
                    let code = '';
                    resources.forEach(vpc => {
                        const resourceName = this.sanitizeResourceName(vpc.name);
                        
                        if (this.exportOptions.includeComments) {
                            code += `# VPC: ${vpc.name} (${vpc.id})\n`;
                        }
                        
                        code += `resource "aws_vpc" "${resourceName}" {
  cidr_block           = "${vpc.cidr}"
  instance_tenancy     = "${vpc.tenancy}"
  enable_dns_support   = true
  enable_dns_hostnames = true
`;
                        
                        // Add tags including Name
                        if (vpc.name) {
                            code += `  tags = {\n`;
                            code += `    Name = "${vpc.name}"\n`;
                            
                            // Add additional tags if present
                            if (vpc.data.Tags) {
                                vpc.data.Tags.forEach(tag => {
                                    if (tag.Key !== 'Name') {
                                        code += `    ${tag.Key} = "${tag.Value}"\n`;
                                    }
                                });
                            }
                            
                            code += `  }\n`;
                        }
                        
                        code += `}\n\n`;
                        
                        // Add additional CIDR blocks if present
                        if (vpc.cidrBlocks && vpc.cidrBlocks.length > 1) {
                            vpc.cidrBlocks.slice(1).forEach((cidr, index) => {
                                code += `resource "aws_vpc_ipv4_cidr_block_association" "${resourceName}_cidr_${index + 1}" {
  vpc_id     = aws_vpc.${resourceName}.id
  cidr_block = "${cidr}"
}\n\n`;
                            });
                        }
                    });
                    
                    return code;
                },
                
                generateSubnetTerraform: function(resources) {
                    let code = '';
                    resources.forEach(subnet => {
                        const resourceName = this.sanitizeResourceName(subnet.name);
                        
                        if (this.exportOptions.includeComments) {
                            code += `# Subnet: ${subnet.name} (${subnet.id})\n`;
                        }
                        
                        code += `resource "aws_subnet" "${resourceName}" {
  vpc_id                  = "${subnet.vpcId}"
  cidr_block              = "${subnet.cidr}"
  availability_zone       = "${subnet.az}"
  map_public_ip_on_launch = ${subnet.public === 'Yes' ? 'true' : 'false'}
`;
                        
                        // Add tags including Name
                        if (subnet.name) {
                            code += `  tags = {\n`;
                            code += `    Name = "${subnet.name}"\n`;
                            
                            // Add additional tags if present
                            if (subnet.data.Tags) {
                                subnet.data.Tags.forEach(tag => {
                                    if (tag.Key !== 'Name') {
                                        code += `    ${tag.Key} = "${tag.Value}"\n`;
                                    }
                                });
                            }
                            
                            code += `  }\n`;
                        }
                        
                        code += `}\n\n`;
                    });
                    
                    return code;
                },
                
                generateSecurityGroupTerraform: function(resources) {
                    let code = '';
                    resources.forEach(sg => {
                        const resourceName = this.sanitizeResourceName(sg.name);
                        
                        if (this.exportOptions.includeComments) {
                            code += `# Security Group: ${sg.name} (${sg.id})\n`;
                        }
                        
                        code += `resource "aws_security_group" "${resourceName}" {
  name        = "${sg.name}"
  description = "${sg.description.replace(/"/g, '\\"')}"
  vpc_id      = "${sg.vpcId}"
`;
                        
                        // Add ingress rules
                        sg.data.IpPermissions.forEach((rule, idx) => {
                            const protocol = rule.IpProtocol === '-1' ? 'all' : rule.IpProtocol;
                            const fromPort = rule.FromPort !== undefined ? rule.FromPort : 0;
                            const toPort = rule.ToPort !== undefined ? rule.ToPort : 0;
                            
                            // Handle IP ranges
                            rule.IpRanges.forEach((ipRange, ipIdx) => {
                                code += `  ingress {\n`;
                                code += `    description = "Rule ${idx+1}.${ipIdx+1}"\n`;
                                code += `    from_port   = ${fromPort}\n`;
                                code += `    to_port     = ${toPort}\n`;
                                code += `    protocol    = "${protocol}"\n`;
                                code += `    cidr_blocks = ["${ipRange.CidrIp}"]\n`;
                                code += `  }\n\n`;
                            });
                            
                            // Handle security group references
                            rule.UserIdGroupPairs.forEach((group, groupIdx) => {
                                code += `  ingress {\n`;
                                code += `    description     = "Rule ${idx+1}.${groupIdx+1} SG"\n`;
                                code += `    from_port       = ${fromPort}\n`;
                                code += `    to_port         = ${toPort}\n`;
                                code += `    protocol        = "${protocol}"\n`;
                                code += `    security_groups = ["${group.GroupId}"]\n`;
                                code += `  }\n\n`;
                            });
                        });
                        
                        // Add egress rules
                        sg.data.IpPermissionsEgress.forEach((rule, idx) => {
                            const protocol = rule.IpProtocol === '-1' ? 'all' : rule.IpProtocol;
                            const fromPort = rule.FromPort !== undefined ? rule.FromPort : 0;
                            const toPort = rule.ToPort !== undefined ? rule.ToPort : 0;
                            
                            // Handle IP ranges
                            rule.IpRanges.forEach((ipRange, ipIdx) => {
                                code += `  egress {\n`;
                                code += `    description = "Egress ${idx+1}.${ipIdx+1}"\n`;
                                code += `    from_port   = ${fromPort}\n`;
                                code += `    to_port     = ${toPort}\n`;
                                code += `    protocol    = "${protocol}"\n`;
                                code += `    cidr_blocks = ["${ipRange.CidrIp}"]\n`;
                                code += `  }\n\n`;
                            });
                        });
                        
                        // Add tags including Name
                        if (sg.name) {
                            code += `  tags = {\n`;
                            code += `    Name = "${sg.name}"\n`;
                            
                            // Add additional tags if present
                            if (sg.data.Tags) {
                                sg.data.Tags.forEach(tag => {
                                    if (tag.Key !== 'Name') {
                                        code += `    ${tag.Key} = "${tag.Value}"\n`;
                                    }
                                });
                            }
                            
                            code += `  }\n`;
                        }
                        
                        code += `}\n\n`;
                    });
                    
                    return code;
                },
                
                generateEBSVolumeTerraform: function(resources) {
                    let code = '';
                    resources.forEach(volume => {
                        const resourceName = this.sanitizeResourceName(volume.name);
                        
                        if (this.exportOptions.includeComments) {
                            code += `# EBS Volume: ${volume.name} (${volume.id})\n`;
                        }
                        
                        code += `resource "aws_ebs_volume" "${resourceName}" {
  availability_zone = "${volume.az}"
  size              = ${parseInt(volume.size)}
  type              = "${volume.data.VolumeType}"
`;

                        // Add encryption if enabled
                        if (volume.data.Encrypted) {
                            code += `  encrypted = true\n`;
                            if (volume.data.KmsKeyId) {
                                code += `  kms_key_id = "${volume.data.KmsKeyId}"\n`;
                            }
                        }
                        
                        // Add tags including Name
                        if (volume.name) {
                            code += `  tags = {\n`;
                            code += `    Name = "${volume.name}"\n`;
                            
                            // Add additional tags if present
                            if (volume.data.Tags) {
                                volume.data.Tags.forEach(tag => {
                                    if (tag.Key !== 'Name') {
                                        code += `    ${tag.Key} = "${tag.Value}"\n`;
                                    }
                                });
                            }
                            
                            code += `  }\n`;
                        }
                        
                        code += `}\n\n`;
                        
                        // Add volume attachment if attached
                        if (volume.instanceId && volume.instanceId !== '-') {
                            const attachmentName = `${resourceName}_attachment`;
                            const instanceName = this.sanitizeResourceName(
                                this.getResourceDetails(volume.instanceId)?.name || volume.instanceId
                            );
                            
                            code += `resource "aws_volume_attachment" "${attachmentName}" {
  device_name = "${volume.data.Attachments[0]?.Device || '/dev/sdf'}"
  volume_id   = aws_ebs_volume.${resourceName}.id
  instance_id = "${volume.instanceId}"
}\n\n`;
                        }
                    });
                    
                    return code;
                },
                
                generateS3BucketTerraform: function(resources) {
                    let code = '';
                    resources.forEach(bucket => {
                        const resourceName = this.sanitizeResourceName(bucket.name);
                        
                        if (this.exportOptions.includeComments) {
                            code += `# S3 Bucket: ${bucket.name}\n`;
                        }
                        
                        code += `resource "aws_s3_bucket" "${resourceName}" {
  bucket = "${bucket.name}"
`;
                        
                        // Add tags if present
                        code += `  tags = {\n`;
                        code += `    Name = "${bucket.name}"\n`;
                        code += `    Exported = "true"\n`;
                        code += `  }\n`;
                        
                        code += `}\n\n`;
                        
                        // Add versioning if enabled
                        if (bucket.versioning && bucket.versioning !== 'Disabled' && bucket.versioning !== 'Unknown') {
                            code += `resource "aws_s3_bucket_versioning" "${resourceName}_versioning" {
  bucket = aws_s3_bucket.${resourceName}.id
  versioning_configuration {
    status = "${bucket.versioning}"
  }
}\n\n`;
                        }
                        
                        // Add public access block
                        code += `resource "aws_s3_bucket_public_access_block" "${resourceName}_public_access" {
  bucket                  = aws_s3_bucket.${resourceName}.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}\n\n`;
                        
                        // Add server-side encryption
                        code += `resource "aws_s3_bucket_server_side_encryption_configuration" "${resourceName}_encryption" {
  bucket = aws_s3_bucket.${resourceName}.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}\n\n`;
                    });
                    
                    return code;
                },
                
                generateRouteTableTerraform: function(resources) {
                    let code = '';
                    resources.forEach(rt => {
                        const resourceName = this.sanitizeResourceName(rt.name);
                        
                        if (this.exportOptions.includeComments) {
                            code += `# Route Table: ${rt.name} (${rt.id})\n`;
                        }
                        
                        code += `resource "aws_route_table" "${resourceName}" {
  vpc_id = "${rt.vpcId}"
`;
                        
                        // Add routes
                        if (rt.data.Routes) {
                            rt.data.Routes.forEach((route, idx) => {
                                // Skip the local route as it's created automatically
                                if (!route.GatewayId || route.GatewayId !== 'local') {
                                    if (route.DestinationCidrBlock) {
                                        code += `  route {\n`;
                                        code += `    cidr_block = "${route.DestinationCidrBlock}"\n`;
                                        
                                        if (route.GatewayId) {
                                            code += `    gateway_id = "${route.GatewayId}"\n`;
                                        } else if (route.NatGatewayId) {
                                            code += `    nat_gateway_id = "${route.NatGatewayId}"\n`;
                                        } else if (route.InstanceId) {
                                            code += `    instance_id = "${route.InstanceId}"\n`;
                                        } else if (route.VpcPeeringConnectionId) {
                                            code += `    vpc_peering_connection_id = "${route.VpcPeeringConnectionId}"\n`;
                                        } else if (route.TransitGatewayId) {
                                            code += `    transit_gateway_id = "${route.TransitGatewayId}"\n`;
                                        }
                                        
                                        code += `  }\n\n`;
                                    }
                                }
                            });
                        }
                        
                        // Add tags including Name
                        if (rt.name) {
                            code += `  tags = {\n`;
                            code += `    Name = "${rt.name}"\n`;
                            
                            // Add additional tags if present
                            if (rt.data.Tags) {
                                rt.data.Tags.forEach(tag => {
                                    if (tag.Key !== 'Name') {
                                        code += `    ${tag.Key} = "${tag.Value}"\n`;
                                    }
                                });
                            }
                            
                            code += `  }\n`;
                        }
                        
                        code += `}\n\n`;
                        
                        // Add route table associations
                        if (rt.data.Associations) {
                            rt.data.Associations.forEach((assoc, idx) => {
                                // Skip main route table association
                                if (!assoc.Main && assoc.SubnetId) {
                                    const assocName = `${resourceName}_assoc_${idx}`;
                                    code += `resource "aws_route_table_association" "${assocName}" {
  subnet_id      = "${assoc.SubnetId}"
  route_table_id = aws_route_table.${resourceName}.id
}\n\n`;
                                }
                            });
                        }
                    });
                    
                    return code;
                },
                
                generateLoadBalancerTerraform: function(resources) {
                    let code = '';
                    resources.forEach(lb => {
                        const resourceName = this.sanitizeResourceName(lb.name);
                        const lbType = lb.type.toLowerCase();
                        
                        if (this.exportOptions.includeComments) {
                            code += `# Load Balancer: ${lb.name}\n`;
                        }
                        
                        code += `resource "aws_${lbType}" "${resourceName}" {
  name               = "${lb.name}"
  internal           = ${lb.scheme === 'internal' ? 'true' : 'false'}
  load_balancer_type = "${lb.type}"
`;

                        // Add subnets
                        if (lb.data.AvailabilityZones && lb.data.AvailabilityZones.length > 0) {
                            code += `  subnets = [\n`;
                            lb.data.AvailabilityZones.forEach(az => {
                                if (az.SubnetId) {
                                    code += `    "${az.SubnetId}",\n`;
                                }
                            });
                            code += `  ]\n`;
                        }
                        
                        // Add security groups for ALB/NLB
                        if (lb.data.SecurityGroups && lb.data.SecurityGroups.length > 0) {
                            code += `  security_groups = [\n`;
                            lb.data.SecurityGroups.forEach(sg => {
                                code += `    "${sg}",\n`;
                            });
                            code += `  ]\n`;
                        }
                        
                        // Add tags
                        code += `  tags = {\n`;
                        code += `    Name = "${lb.name}"\n`;
                        code += `  }\n`;
                        
                        code += `}\n\n`;
                    });
                    
                    return code;
                },
                
                generateTargetGroupTerraform: function(resources) {
                    let code = '';
                    resources.forEach(tg => {
                        const resourceName = this.sanitizeResourceName(tg.name);
                        
                        if (this.exportOptions.includeComments) {
                            code += `# Target Group: ${tg.name}\n`;
                        }
                        
                        code += `resource "aws_lb_target_group" "${resourceName}" {
  name        = "${tg.name}"
  port        = ${tg.port}
  protocol    = "${tg.protocol}"
  target_type = "${tg.targetType}"
  vpc_id      = "${tg.vpcId}"
  
  health_check {
    enabled             = true
    path                = "${tg.healthCheckPath}"
    protocol            = "${tg.healthCheckProtocol}"
    port                = "${tg.healthCheckPort || 'traffic-port'}"
    healthy_threshold   = ${tg.data.HealthCheckThresholdCount || 3}
    unhealthy_threshold = ${tg.data.UnhealthyThresholdCount || 3}
    timeout             = ${tg.data.HealthCheckTimeoutSeconds || 5}
    interval            = ${tg.data.HealthCheckIntervalSeconds || 30}
  }
`;
                        
                        // Add tags
                        code += `  tags = {\n`;
                        code += `    Name = "${tg.name}"\n`;
                        code += `  }\n`;
                        
                        code += `}\n\n`;
                    });
                    
                    return code;
                },
                
                generateListenerTerraform: function(resources) {
                    let code = '';
                    resources.forEach(listener => {
                        const resourceName = this.sanitizeResourceName(`${listener.lbName}_${listener.protocol}_${listener.port}`);
                        
                        if (this.exportOptions.includeComments) {
                            code += `# Listener: ${listener.name}\n`;
                        }
                        
                        code += `resource "aws_lb_listener" "${resourceName}" {
  load_balancer_arn = "${listener.lbArn}"
  port              = "${listener.port}"
  protocol          = "${listener.protocol}"
`;

                        // Add SSL certificate if HTTPS
                        if (listener.protocol === 'HTTPS' && listener.data.Certificates && listener.data.Certificates.length > 0) {
                            code += `  ssl_policy      = "${listener.sslPolicy}"\n`;
                            code += `  certificate_arn = "${listener.data.Certificates[0].CertificateArn}"\n`;
                        }
                        
                        // Add default action
                        code += `  default_action {\n`;
                        if (listener.data.DefaultActions && listener.data.DefaultActions.length > 0) {
                            const action = listener.data.DefaultActions[0];
                            code += `    type = "${action.Type}"\n`;
                            
                            if (action.Type === 'forward' && action.TargetGroupArn) {
                                code += `    target_group_arn = "${action.TargetGroupArn}"\n`;
                            } else if (action.Type === 'redirect') {
                                code += `    redirect {\n`;
                                code += `      port        = "${action.RedirectConfig.Port || '443'}"\n`;
                                code += `      protocol    = "${action.RedirectConfig.Protocol || 'HTTPS'}"\n`;
                                code += `      status_code = "${action.RedirectConfig.StatusCode || 'HTTP_301'}"\n`;
                                code += `    }\n`;
                            } else if (action.Type === 'fixed-response') {
                                code += `    fixed_response {\n`;
                                code += `      content_type = "${action.FixedResponseConfig.ContentType}"\n`;
                                code += `      message_body = "${action.FixedResponseConfig.MessageBody || ''}"\n`;
                                code += `      status_code  = "${action.FixedResponseConfig.StatusCode || '200'}"\n`;
                                code += `    }\n`;
                            }
                        } else {
                            // Default forward action
                            code += `    type = "forward"\n`;
                            code += `    # You need to specify a target_group_arn\n`;
                            code += `    # target_group_arn = "arn:aws:elasticloadbalancing:..."\n`;
                        }
                        code += `  }\n`;
                        
                        code += `}\n\n`;
                    });
                    
                    return code;
                },
                
                generateNetworkInterfaceTerraform: function(resources) {
                    let code = '';
                    resources.forEach(ni => {
                        const resourceName = this.sanitizeResourceName(ni.name);
                        
                        if (this.exportOptions.includeComments) {
                            code += `# Network Interface: ${ni.name} (${ni.id})\n`;
                        }
                        
                        code += `resource "aws_network_interface" "${resourceName}" {
  subnet_id       = "${ni.subnetId}"
  private_ips     = ["${ni.privateIp}"]
`;

                        // Add security groups if present
                        if (ni.data.Groups && ni.data.Groups.length > 0) {
                            code += `  security_groups = [\n`;
                            ni.data.Groups.forEach(group => {
                                code += `    "${group.GroupId}",\n`;
                            });
                            code += `  ]\n`;
                        }
                        
                        // Add description if present
                        if (ni.data.Description) {
                            code += `  description = "${ni.data.Description}"\n`;
                        }
                        
                        // Add tags including Name
                        if (ni.name) {
                            code += `  tags = {\n`;
                            code += `    Name = "${ni.name}"\n`;
                            
                            // Add additional tags if present
                            if (ni.data.TagSet) {
                                ni.data.TagSet.forEach(tag => {
                                    if (tag.Key !== 'Name') {
                                        code += `    ${tag.Key} = "${tag.Value}"\n`;
                                    }
                                });
                            }
                            
                            code += `  }\n`;
                        }
                        
                        code += `}\n\n`;
                        
                        // Add attachment if attached to an instance
                        if (ni.instanceId && ni.instanceId !== '-' && ni.data.Attachment) {
                            const attachmentName = `${resourceName}_attachment`;
                            
                            code += `resource "aws_network_interface_attachment" "${attachmentName}" {
  instance_id          = "${ni.instanceId}"
  network_interface_id = aws_network_interface.${resourceName}.id
  device_index         = ${ni.data.Attachment.DeviceIndex || 1}
}\n\n`;
                        }
                    });
                    
                    return code;
                },
                
                generateElasticIPTerraform: function(resources) {
                    let code = '';
                    resources.forEach(eip => {
                        const resourceName = this.sanitizeResourceName(eip.name);
                        
                        if (this.exportOptions.includeComments) {
                            code += `# Elastic IP: ${eip.name} (${eip.publicIp})\n`;
                        }
                        
                        code += `resource "aws_eip" "${resourceName}" {
  domain = "${eip.domain || 'vpc'}"
`;
                        
                        // Add instance ID if associated
                        if (eip.instanceId && eip.instanceId !== '-') {
                            code += `  instance = "${eip.instanceId}"\n`;
                        }
                        
                        // Add tags including Name
                        if (eip.name) {
                            code += `  tags = {\n`;
                            code += `    Name = "${eip.name}"\n`;
                            
                            // Add additional tags if present
                            if (eip.data.Tags) {
                                eip.data.Tags.forEach(tag => {
                                    if (tag.Key !== 'Name') {
                                        code += `    ${tag.Key} = "${tag.Value}"\n`;
                                    }
                                });
                            }
                            
                            code += `  }\n`;
                        }
                        
                        code += `}\n\n`;
                    });
                    
                    return code;
                },
                
                // Helper function to sanitize resource names for Terraform
                sanitizeResourceName: function(name) {
                    if (!name) return 'resource';
                    
                    // Remove special characters and replace spaces with underscores
                    return name
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, '_')
                        .replace(/_+/g, '_')
                        .replace(/^_|_$/g, '');
                },
                
                // Select or deselect all resources for export
                selectAllResources: function(selected) {
                    this.exportSelectedResources.forEach(resource => {
                        resource.selected = selected;
                    });
                },
                
                // Handle resource row click based on current service
                handleResourceClick: function(resource) {
                    switch(this.currentService) {
                        case 'ec2_instances':
                            this.showInstanceDetails(resource);
                            break;
                        case 'rds':
                            this.showDatabaseDetails(resource);
                            break;
                        case 'valkey_clusters':
                            this.showValKeyDetails(resource);
                            break;
                        // Add other resource types as needed
                    }
                },
                
                // Show instance detail modal
                showInstanceDetails: function(instance) {
                    this.selectedInstance = instance;
                    this.currentInstanceTab = 'details';
                    this.showInstanceDetailModal = true;
                    
                    // Reset data collections
                    this.instanceNetworkInterfaces = [];
                    this.instanceElasticIPs = [];
                    this.instanceVolumes = [];
                    this.instanceTerraformCode = '';
                    
                    // Load related resources
                    this.loadInstanceNetworkInterfaces();
                    this.loadInstanceElasticIPs();
                    this.loadInstanceVolumes();
                    this.generateInstanceTerraformCode();
                },
                
                // Show database detail modal
                showDatabaseDetails: function(database) {
                    this.selectedDatabase = database;
                    this.currentDatabaseTab = 'details';
                    this.showDatabaseDetailModal = true;
                    
                    // Reset data collections
                    this.databaseSecurityGroups = [];
                    this.databaseSubnets = [];
                    this.databaseParameterGroups = [];
                    this.databaseTerraformCode = '';
                    
                    // Load related resources
                    this.loadDatabaseSecurityGroups();
                    this.loadDatabaseSubnets();
                    this.generateDatabaseTerraformCode();
                },
                
                // Load network interfaces for the selected instance
                loadInstanceNetworkInterfaces: function() {
                    if (!this.selectedInstance || !this.selectedInstance.id) return;
                    
                    const ec2 = new AWS.EC2();
                    ec2.describeNetworkInterfaces({
                        Filters: [
                            {
                                Name: 'attachment.instance-id',
                                Values: [this.selectedInstance.id]
                            }
                        ]
                    }, (err, data) => {
                        if (err) {
                            console.error("Error loading network interfaces for instance:", err);
                            return;
                        }
                        
                        this.instanceNetworkInterfaces = data.NetworkInterfaces.map(ni => {
                            const name = ni.TagSet ? ni.TagSet.find(tag => tag.Key === 'Name')?.Value : '';
                            return {
                                id: ni.NetworkInterfaceId,
                                name: name || ni.NetworkInterfaceId,
                                privateIp: ni.PrivateIpAddress,
                                publicIp: ni.Association ? ni.Association.PublicIp : '-',
                                subnetId: ni.SubnetId,
                                vpcId: ni.VpcId,
                                status: ni.Status,
                                instanceId: ni.Attachment ? ni.Attachment.InstanceId : '-',
                                data: ni
                            };
                        });
                    });
                },
                
                // Load Elastic IPs for the selected instance
                loadInstanceElasticIPs: function() {
                    if (!this.selectedInstance || !this.selectedInstance.id) return;
                    
                    const ec2 = new AWS.EC2();
                    ec2.describeAddresses({
                        Filters: [
                            {
                                Name: 'instance-id',
                                Values: [this.selectedInstance.id]
                            }
                        ]
                    }, (err, data) => {
                        if (err) {
                            console.error("Error loading Elastic IPs for instance:", err);
                            return;
                        }
                        
                        this.instanceElasticIPs = data.Addresses.map(eip => {
                            const name = eip.Tags ? eip.Tags.find(tag => tag.Key === 'Name')?.Value : '';
                            return {
                                id: eip.AllocationId || eip.PublicIp,
                                name: name || eip.PublicIp,
                                publicIp: eip.PublicIp,
                                privateIp: eip.PrivateIpAddress || '-',
                                instanceId: eip.InstanceId,
                                domain: eip.Domain,
                                data: eip
                            };
                        });
                    });
                },
                
                // Load EBS volumes for the selected instance
                loadInstanceVolumes: function() {
                    if (!this.selectedInstance || !this.selectedInstance.id) return;
                    
                    const ec2 = new AWS.EC2();
                    ec2.describeVolumes({
                        Filters: [
                            {
                                Name: 'attachment.instance-id',
                                Values: [this.selectedInstance.id]
                            }
                        ]
                    }, (err, data) => {
                        if (err) {
                            console.error("Error loading volumes for instance:", err);
                            return;
                        }
                        
                        this.instanceVolumes = data.Volumes.map(volume => {
                            const name = volume.Tags ? volume.Tags.find(tag => tag.Key === 'Name')?.Value : '';
                            return {
                                id: volume.VolumeId,
                                name: name || volume.VolumeId,
                                size: volume.Size + ' GB',
                                type: volume.VolumeType,
                                state: volume.State,
                                az: volume.AvailabilityZone,
                                instanceId: volume.Attachments.length > 0 ? volume.Attachments[0].InstanceId : '-',
                                data: volume
                            };
                        });
                    });
                },
                
                // Get security group details by ID
                getSecurityGroupDetails: function(groupId) {
                    // First check in the resourceMap
                    if (this.resourceMap[groupId]) {
                        return this.resourceMap[groupId];
                    }
                    
                    // Check in cached security groups
                    const secGroup = this.cachedResources.securityGroups.find(sg => sg.id === groupId);
                    if (secGroup) {
                        return {
                            name: secGroup.name,
                            description: secGroup.description
                        };
                    }
                    
                    return null;
                },
                
                // Show ValKey detail modal
                showValKeyDetails: function(valKey) {
                    this.selectedValKey = valKey;
                    this.currentValKeyTab = 'details';
                    this.showValKeyDetailModal = true;
                    
                    // Reset data collections
                    this.valKeyNodes = [];
                    this.valKeySecurityGroups = [];
                    this.valKeyTerraformCode = '';
                    
                    // Load related resources
                    this.loadValKeyNodes();
                    this.loadValKeySecurityGroups();
                    this.generateValKeyTerraformCode();
                },
                
                // Load node details for the selected ValKey cluster
                loadValKeyNodes: function() {
                    if (!this.selectedValKey || !this.selectedValKey.id) return;
                    
                    const elasticache = new AWS.ElastiCache();
                    
                    // For standalone clusters, get node info
                    if (!this.selectedValKey.data.ReplicationGroupId) {
                        elasticache.describeCacheClusters({
                            CacheClusterId: this.selectedValKey.id,
                            ShowCacheNodeInfo: true
                        }, (err, data) => {
                            if (err) {
                                console.error("Error loading ValKey nodes:", err);
                                return;
                            }
                            
                            if (data.CacheClusters && data.CacheClusters.length > 0) {
                                const cluster = data.CacheClusters[0];
                                
                                if (cluster.CacheNodes) {
                                    this.valKeyNodes = cluster.CacheNodes.map((node, idx) => {
                                        return {
                                            id: node.CacheNodeId,
                                            status: node.CacheNodeStatus,
                                            az: cluster.PreferredAvailabilityZone,
                                            endpoint: node.Endpoint ? `${node.Endpoint.Address}:${node.Endpoint.Port}` : '-',
                                            port: node.Endpoint ? node.Endpoint.Port : '-',
                                            createdAt: cluster.CacheClusterCreateTime,
                                            parameterGroupStatus: node.ParameterGroupStatus
                                        };
                                    });
                                }
                            }
                        });
                    } 
                    // For replication groups, get node info for each member cluster
                    else if (this.selectedValKey.data.MemberClusters) {
                        const memberClusters = this.selectedValKey.data.MemberClusters;
                        
                        // Create promises for each cluster's node info
                        const promises = memberClusters.map(clusterId => {
                            return new Promise((resolve) => {
                                elasticache.describeCacheClusters({
                                    CacheClusterId: clusterId,
                                    ShowCacheNodeInfo: true
                                }, (err, data) => {
                                    if (err || !data.CacheClusters || data.CacheClusters.length === 0) {
                                        resolve([]);
                                        return;
                                    }
                                    
                                    const cluster = data.CacheClusters[0];
                                    const nodes = cluster.CacheNodes ? cluster.CacheNodes.map((node, idx) => {
                                        return {
                                            id: `${clusterId}-${node.CacheNodeId}`,
                                            clusterId: clusterId,
                                            status: node.CacheNodeStatus,
                                            az: cluster.PreferredAvailabilityZone,
                                            endpoint: node.Endpoint ? `${node.Endpoint.Address}:${node.Endpoint.Port}` : '-',
                                            createdAt: cluster.CacheClusterCreateTime,
                                            parameterGroupStatus: node.ParameterGroupStatus
                                        };
                                    }) : [];
                                    
                                    resolve(nodes);
                                });
                            });
                        });
                        
                        // When all promises are resolved, update the nodes
                        Promise.all(promises).then(nodeArrays => {
                            // Flatten array of arrays
                            this.valKeyNodes = [].concat(...nodeArrays);
                        }).catch(error => {
                            console.error("Error loading ValKey node details:", error);
                        });
                    }
                },
                
                // Load security groups for the selected ValKey cluster
                loadValKeySecurityGroups: function() {
                    if (!this.selectedValKey || !this.selectedValKey.data) return;
                    
                    // Get security group IDs from the cache cluster
                    let securityGroupIds = [];
                    
                    // Check if we have security groups directly on the selected ValKey
                    if (this.selectedValKey.data.SecurityGroups) {
                        securityGroupIds = this.selectedValKey.data.SecurityGroups.map(sg => sg.SecurityGroupId);
                    }
                    // For replication groups, we need to get the security groups from member clusters
                    else if (this.selectedValKey.data.MemberClusters && this.selectedValKey.data.MemberClusters.length > 0) {
                        const elasticache = new AWS.ElastiCache();
                        const clusterId = this.selectedValKey.data.MemberClusters[0];
                        
                        elasticache.describeCacheClusters({
                            CacheClusterId: clusterId
                        }, (err, data) => {
                            if (err || !data.CacheClusters || data.CacheClusters.length === 0) {
                                console.error("Error loading member cluster details:", err);
                                return;
                            }
                            
                            const cluster = data.CacheClusters[0];
                            if (cluster.SecurityGroups) {
                                securityGroupIds = cluster.SecurityGroups.map(sg => sg.SecurityGroupId);
                                this.loadSecurityGroupDetails(securityGroupIds);
                            }
                        });
                        
                        return; // We'll fetch the SGs asynchronously
                    }
                    
                    // If we already have SG IDs, fetch their details
                    if (securityGroupIds.length > 0) {
                        this.loadSecurityGroupDetails(securityGroupIds);
                    }
                },
                
                // Load details for security groups by IDs
                loadSecurityGroupDetails: function(securityGroupIds) {
                    if (!securityGroupIds || securityGroupIds.length === 0) return;
                    
                    const ec2 = new AWS.EC2();
                    ec2.describeSecurityGroups({ GroupIds: securityGroupIds }, (err, data) => {
                        if (err) {
                            console.error("Error loading security groups:", err);
                            return;
                        }
                        
                        this.valKeySecurityGroups = data.SecurityGroups.map(sg => ({
                            id: sg.GroupId,
                            name: sg.GroupName,
                            description: sg.Description,
                            vpcId: sg.VpcId,
                            ingressRulesCount: sg.IpPermissions.length,
                            egressRulesCount: sg.IpPermissionsEgress.length,
                            data: sg
                        }));
                    });
                },
                
                // Generate Terraform code for the selected ValKey cluster
                generateValKeyTerraformCode: function() {
                    if (!this.selectedValKey || !this.selectedValKey.id) return;
                    
                    const valKey = this.selectedValKey;
                    const resourceName = this.sanitizeResourceName(valKey.name);
                    let code = '';
                    
                    if (this.selectedValKey.data.ReplicationGroupId) {
                        // This is a node in a replication group
                        code = `# ElastiCache ValKey Replication Group: ${valKey.name} (${valKey.id})\n`;
                        code += `resource "aws_elasticache_replication_group" "${resourceName}" {\n`;
                        code += `  replication_group_id       = "${valKey.id}"\n`;
                        code += `  description                = "ValKey replication group"\n`;
                        code += `  node_type                  = "${valKey.nodeType}"\n`;
                        code += `  num_cache_clusters         = ${valKey.numNodes || 1}\n`;
                        code += `  port                       = ${valKey.port || 6379}\n`;
                        code += `  engine                     = "valkey"\n`;
                        code += `  engine_version             = "${valKey.engineVersion}"\n`;
                        
                        if (valKey.data.AutomaticFailover === 'enabled') {
                            code += `  automatic_failover_enabled = true\n`;
                        }
                        
                        if (valKey.data.MultiAZ === 'enabled' || valKey.multiAZ === 'Yes') {
                            code += `  multi_az_enabled = true\n`;
                        }
                        
                        if (valKey.vpcId && valKey.vpcId !== '-') {
                            code += `  subnet_group_name = "${valKey.vpcId}"\n`;
                        }
                        
                        // Add tags if present
                        if (valKey.data.Tags && valKey.data.Tags.length > 0) {
                            code += `  tags = {\n`;
                            valKey.data.Tags.forEach(tag => {
                                code += `    ${tag.Key} = "${tag.Value}"\n`;
                            });
                            code += `  }\n`;
                        }
                        
                        code += `}\n`;
                    } else {
                        // This is a standalone cluster
                        code = `# ElastiCache ValKey Cluster: ${valKey.name} (${valKey.id})\n`;
                        code += `resource "aws_elasticache_cluster" "${resourceName}" {\n`;
                        code += `  cluster_id           = "${valKey.id}"\n`;
                        code += `  engine               = "valkey"\n`;
                        code += `  node_type            = "${valKey.nodeType}"\n`;
                        code += `  num_cache_nodes      = ${valKey.nodeCount || 1}\n`;
                        code += `  parameter_group_name = "${valKey.data?.CacheParameterGroup?.CacheParameterGroupName || "default.valkey7"}"\n`;
                        code += `  port                 = ${valKey.port || 6379}\n`;
                        
                        if (valKey.engineVersion) {
                            code += `  engine_version       = "${valKey.engineVersion}"\n`;
                        }
                        
                        if (valKey.vpcId && valKey.vpcId !== '-') {
                            code += `  subnet_group_name    = "${valKey.vpcId}"\n`;
                        }
                        
                        // Add tags if present
                        if (valKey.data.Tags && valKey.data.Tags.length > 0) {
                            code += `  tags = {\n`;
                            valKey.data.Tags.forEach(tag => {
                                code += `    ${tag.Key} = "${tag.Value}"\n`;
                            });
                            code += `  }\n`;
                        }
                        
                        code += `}\n`;
                    }
                    
                    this.valKeyTerraformCode = code;
                },
                
                // Generate Terraform code for the selected instance
                generateInstanceTerraformCode: function() {
                    if (!this.selectedInstance || !this.selectedInstance.id) return;
                    
                    // Use the existing generator for EC2 instances
                    this.instanceTerraformCode = this.generateEC2InstancesTerraform([this.selectedInstance]);
                },
                
                // Load security groups for the selected RDS database
                loadDatabaseSecurityGroups: function() {
                    if (!this.selectedDatabase || !this.selectedDatabase.data) return;
                    
                    const securityGroupIds = this.selectedDatabase.data.VpcSecurityGroups ? 
                        this.selectedDatabase.data.VpcSecurityGroups.map(sg => sg.VpcSecurityGroupId) : [];
                    
                    if (securityGroupIds.length === 0) return;
                    
                    const ec2 = new AWS.EC2();
                    ec2.describeSecurityGroups({ GroupIds: securityGroupIds }, (err, data) => {
                        if (err) {
                            console.error("Error loading security groups for database:", err);
                            return;
                        }
                        
                        this.databaseSecurityGroups = data.SecurityGroups.map(sg => ({
                            id: sg.GroupId,
                            name: sg.GroupName,
                            description: sg.Description,
                            vpcId: sg.VpcId,
                            ingressRulesCount: sg.IpPermissions.length,
                            egressRulesCount: sg.IpPermissionsEgress.length,
                            data: sg
                        }));
                    });
                },
                
                // Load subnets for the selected RDS database
                loadDatabaseSubnets: function() {
                    if (!this.selectedDatabase || !this.selectedDatabase.data || !this.selectedDatabase.data.DBSubnetGroup) return;
                    
                    const subnetIds = this.selectedDatabase.data.DBSubnetGroup.Subnets ?
                        this.selectedDatabase.data.DBSubnetGroup.Subnets.map(subnet => subnet.SubnetIdentifier) : [];
                    
                    if (subnetIds.length === 0) return;
                    
                    const ec2 = new AWS.EC2();
                    ec2.describeSubnets({ SubnetIds: subnetIds }, (err, data) => {
                        if (err) {
                            console.error("Error loading subnets for database:", err);
                            return;
                        }
                        
                        this.databaseSubnets = data.Subnets.map(subnet => {
                            const name = subnet.Tags ? subnet.Tags.find(tag => tag.Key === 'Name')?.Value : '';
                            return {
                                id: subnet.SubnetId,
                                name: name || subnet.SubnetId,
                                vpcId: subnet.VpcId,
                                cidr: subnet.CidrBlock,
                                az: subnet.AvailabilityZone,
                                availableIpCount: subnet.AvailableIpAddressCount,
                                state: subnet.State,
                                public: subnet.MapPublicIpOnLaunch ? 'Yes' : 'No',
                                data: subnet
                            };
                        });
                    });
                },
                
                // Generate Terraform code for the selected database
                generateDatabaseTerraformCode: function() {
                    if (!this.selectedDatabase || !this.selectedDatabase.id) return;
                    
                    const db = this.selectedDatabase;
                    const resourceName = this.sanitizeResourceName(db.name);
                    
                    let code = `# RDS Database: ${db.name} (${db.id})\n`;
                    code += `resource "aws_db_instance" "${resourceName}" {\n`;
                    code += `  identifier           = "${db.id}"\n`;
                    code += `  engine               = "${db.data.Engine}"\n`;
                    code += `  engine_version       = "${db.data.EngineVersion}"\n`;
                    code += `  instance_class       = "${db.data.DBInstanceClass}"\n`;
                    code += `  allocated_storage    = ${db.data.AllocatedStorage}\n`;
                    code += `  storage_type         = "${db.data.StorageType}"\n`;
                    code += `  db_subnet_group_name = "${db.data.DBSubnetGroup ? db.data.DBSubnetGroup.DBSubnetGroupName : ''}"\n`;
                    
                    if (db.data.VpcSecurityGroups && db.data.VpcSecurityGroups.length > 0) {
                        code += `  vpc_security_group_ids = [\n`;
                        db.data.VpcSecurityGroups.forEach(sg => {
                            code += `    "${sg.VpcSecurityGroupId}",\n`;
                        });
                        code += `  ]\n`;
                    }
                    
                    code += `  multi_az             = ${db.data.MultiAZ ? 'true' : 'false'}\n`;
                    code += `  publicly_accessible  = ${db.data.PubliclyAccessible ? 'true' : 'false'}\n`;
                    code += `  storage_encrypted    = ${db.data.StorageEncrypted ? 'true' : 'false'}\n`;
                    
                    if (db.data.AvailabilityZone) {
                        code += `  availability_zone    = "${db.data.AvailabilityZone}"\n`;
                    }
                    
                    if (db.data.BackupRetentionPeriod) {
                        code += `  backup_retention_period = ${db.data.BackupRetentionPeriod}\n`;
                        
                        if (db.data.PreferredBackupWindow) {
                            code += `  backup_window        = "${db.data.PreferredBackupWindow}"\n`;
                        }
                    }
                    
                    if (db.data.PreferredMaintenanceWindow) {
                        code += `  maintenance_window   = "${db.data.PreferredMaintenanceWindow}"\n`;
                    }
                    
                    if (db.data.Tags && db.data.Tags.length > 0) {
                        code += `  tags = {\n`;
                        db.data.Tags.forEach(tag => {
                            code += `    ${tag.Key} = "${tag.Value}"\n`;
                        });
                        code += `  }\n`;
                    }
                    
                    code += `}\n`;
                    
                    this.databaseTerraformCode = code;
                },
                
                // ElastiCache clusters resource loading
                loadElastiCacheResources: function() {
                    const elasticache = new AWS.ElastiCache();
                    elasticache.describeCacheClusters({ ShowCacheClustersNotInReplicationGroups: true }, (err, data) => {
                        this.loading = false;
                        if (err) {
                            console.error("Error loading ElastiCache clusters:", err);
                            return;
                        }
                        
                        const clusters = data.CacheClusters ? data.CacheClusters.map(cluster => {
                            return {
                                id: cluster.CacheClusterId,
                                name: cluster.CacheClusterId,
                                engine: cluster.Engine,
                                version: cluster.EngineVersion,
                                nodeType: cluster.CacheNodeType,
                                numNodes: cluster.NumCacheNodes,
                                status: cluster.CacheClusterStatus,
                                subnet: cluster.CacheSubnetGroupName,
                                vpcId: '-', // Need to fetch from subnet group
                                port: cluster.ConfigurationEndpoint ? cluster.ConfigurationEndpoint.Port : '-',
                                endpoint: cluster.ConfigurationEndpoint ? 
                                    cluster.ConfigurationEndpoint.Address : 
                                    (cluster.CacheNodes && cluster.CacheNodes.length > 0 ? 
                                        cluster.CacheNodes[0].Endpoint?.Address : '-'),
                                data: cluster
                            };
                        }) : [];
                        
                        this.resources = clusters;
                    });
                },
                
                // Redis clusters resource loading
                loadRedisClustersResources: function() {
                    const elasticache = new AWS.ElastiCache();
                    
                    // First get all cache clusters to check which ones are redis
                    this.loading = true;
                    elasticache.describeCacheClusters({}, (err, data) => {
                        if (err) {
                            this.loading = false;
                            console.error("Error loading ElastiCache clusters:", err);
                            return;
                        }
                        
                        console.log("Loading Redis clusters...");
                        
                        // Check for any cache clusters with redis engine
                        const redisClusters = data.CacheClusters ? data.CacheClusters
                            .filter(cluster => cluster.Engine === 'redis')
                            .map(cluster => {
                                return {
                                    id: cluster.CacheClusterId,
                                    name: cluster.CacheClusterId,
                                    description: cluster.CacheParameterGroup ? cluster.CacheParameterGroup.CacheParameterGroupName : '-',
                                    status: cluster.CacheClusterStatus,
                                    nodeType: cluster.CacheNodeType,
                                    engine: 'redis',
                                    engineVersion: cluster.EngineVersion,
                                    multiAZ: cluster.ReplicationGroupId ? 'Yes' : 'No',
                                    numNodes: cluster.NumCacheNodes,
                                    vpcId: cluster.CacheSubnetGroupName || '-',
                                    endpoint: cluster.ConfigurationEndpoint ? 
                                        `${cluster.ConfigurationEndpoint.Address}:${cluster.ConfigurationEndpoint.Port}` : 
                                        (cluster.CacheNodes && cluster.CacheNodes.length > 0 && cluster.CacheNodes[0].Endpoint ? 
                                            `${cluster.CacheNodes[0].Endpoint.Address}:${cluster.CacheNodes[0].Endpoint.Port}` : '-'),
                                    data: cluster
                                };
                            }) : [];
                        
                        console.log(`Found ${redisClusters.length} individual Redis nodes`);
                        
                        // Get all Redis replication groups
                        elasticache.describeReplicationGroups({}, (rgErr, rgData) => {
                            this.loading = false;
                            
                            if (rgErr) {
                                console.error("Error loading Redis replication groups:", rgErr);
                                // Still show any directly found clusters
                                this.resources = redisClusters;
                                return;
                            }
                            
                            // Collect all replication group IDs that have Redis engine
                            const redisRgIds = new Set();
                            
                            // First find any replication groups that explicitly have engine=redis
                            let replicationGroups = rgData.ReplicationGroups || [];
                            const redisRGs = replicationGroups.filter(rg => !rg.Engine || rg.Engine === 'redis');
                            redisRGs.forEach(rg => redisRgIds.add(rg.ReplicationGroupId));
                            
                            // Also add any RG IDs from clusters that have Redis engine
                            if (data.CacheClusters) {
                                data.CacheClusters.forEach(cluster => {
                                    if (cluster.Engine === 'redis' && cluster.ReplicationGroupId) {
                                        redisRgIds.add(cluster.ReplicationGroupId);
                                    }
                                });
                            }
                            
                            console.log(`Found ${redisRgIds.size} Redis replication groups`);
                            
                            // Now map all Redis replication groups
                            const redisReplicationGroups = replicationGroups
                                .filter(rg => !rg.Engine || rg.Engine === 'redis' || redisRgIds.has(rg.ReplicationGroupId))
                                .map(group => {
                                    // Find node type and version from member clusters
                                    let nodeType = '-';
                                    let engineVersion = '-';
                                    let subnetGroup = '-';
                                    
                                    if (group.MemberClusters && group.MemberClusters.length > 0) {
                                        const memberId = group.MemberClusters[0];
                                        const memberCluster = data.CacheClusters ? 
                                            data.CacheClusters.find(c => c.CacheClusterId === memberId) : null;
                                            
                                        if (memberCluster) {
                                            nodeType = memberCluster.CacheNodeType;
                                            engineVersion = memberCluster.EngineVersion;
                                            subnetGroup = memberCluster.CacheSubnetGroupName;
                                        }
                                    }
                                    
                                    return {
                                        id: group.ReplicationGroupId,
                                        name: group.ReplicationGroupId,
                                        description: group.Description,
                                        status: group.Status,
                                        nodeType: group.CacheNodeType || nodeType,
                                        engine: 'redis',
                                        engineVersion: group.EngineVersion || engineVersion,
                                        multiAZ: group.MultiAZ ? 'Yes' : 'No',
                                        numNodes: group.MemberClusters ? group.MemberClusters.length : 0,
                                        primaryEndpoint: (group.NodeGroups && group.NodeGroups.length > 0 && 
                                                    group.NodeGroups[0] && group.NodeGroups[0].PrimaryEndpoint && 
                                                    group.NodeGroups[0].PrimaryEndpoint.Address) ? 
                                            `${group.NodeGroups[0].PrimaryEndpoint.Address}:${group.NodeGroups[0].PrimaryEndpoint.Port}` : '-',
                                        readerEndpoint: (group.NodeGroups && group.NodeGroups.length > 0 && 
                                                    group.NodeGroups[0] && group.NodeGroups[0].ReaderEndpoint && 
                                                    group.NodeGroups[0].ReaderEndpoint.Address) ? 
                                            `${group.NodeGroups[0].ReaderEndpoint.Address}:${group.NodeGroups[0].ReaderEndpoint.Port}` : '-',
                                        vpcId: subnetGroup,
                                        data: group
                                    };
                                });
                            
                            // Combine standalone clusters with replication groups
                            // Filter out clusters that are part of replication groups to avoid duplicates
                            const standaloneRedisNodes = redisClusters.filter(
                                cluster => !cluster.data.ReplicationGroupId
                            );
                            
                            console.log(`Found ${standaloneRedisNodes.length} standalone Redis nodes`);
                            console.log(`Total Redis resources: ${redisReplicationGroups.length + standaloneRedisNodes.length}`);
                            
                            // Update the resources
                            this.resources = [...redisReplicationGroups, ...standaloneRedisNodes];
                        });
                    });
                },
                
                // Valkey clusters resource loading
                loadValkeyClustersResources: function() {
                    const elasticache = new AWS.ElastiCache();
                    
                    this.loading = true;
                    console.log("Loading Valkey clusters...");
                    
                    try {
                        // First try a simple approach that won't cause any errors
                        elasticache.describeCacheClusters({ ShowCacheNodeInfo: false }, (err, data) => {
                            if (err) {
                                this.loading = false;
                                console.error("Error loading ElastiCache clusters:", err);
                                return;
                            }
                            
                            try {
                                // Build a list of Valkey clusters and their replication groups
                                const valkeyClusterMap = {};
                                const valkeyRgIds = new Set();
                                
                                // Look for clusters with engine=valkey
                                if (data.CacheClusters && data.CacheClusters.length > 0) {
                                    data.CacheClusters.forEach(cluster => {
                                        // Check if it's a Valkey cluster
                                        if (cluster.Engine === 'valkey' || 
                                            // Some older API versions might use specific parameter groups
                                            (cluster.CacheParameterGroup && 
                                             cluster.CacheParameterGroup.CacheParameterGroupName &&
                                             cluster.CacheParameterGroup.CacheParameterGroupName.includes('valkey'))) {
                                            
                                            const clusterId = cluster.CacheClusterId;
                                            valkeyClusterMap[clusterId] = {
                                                id: clusterId,
                                                name: clusterId,
                                                description: cluster.CacheParameterGroup ? 
                                                    cluster.CacheParameterGroup.CacheParameterGroupName : '-',
                                                status: cluster.CacheClusterStatus,
                                                nodeType: cluster.CacheNodeType || '-',
                                                engine: 'valkey',
                                                engineVersion: cluster.EngineVersion || '-',
                                                multiAZ: cluster.ReplicationGroupId ? 'Yes' : 'No',
                                                numNodes: cluster.NumCacheNodes || 1,
                                                vpcId: cluster.CacheSubnetGroupName || '-',
                                                endpoint: '-', // Will populate if available
                                                port: '-', // Will populate if available
                                                rgId: cluster.ReplicationGroupId || null,
                                                data: cluster
                                            };
                                            
                                            // Track replication group IDs
                                            if (cluster.ReplicationGroupId) {
                                                valkeyRgIds.add(cluster.ReplicationGroupId);
                                            }
                                        }
                                    });
                                }
                                
                                console.log(`Found ${Object.keys(valkeyClusterMap).length} Valkey clusters`);
                                console.log(`Found ${valkeyRgIds.size} potential Valkey replication groups`);
                                
                                // Now fetch node details for endpoints if needed
                                const clusterDetailsPromises = Object.keys(valkeyClusterMap).map(clusterId => {
                                    return new Promise((resolve) => {
                                        // Skip this step for clusters that are part of replication groups
                                        // since we'll get endpoint info from the RG
                                        if (valkeyClusterMap[clusterId].rgId) {
                                            resolve();
                                            return;
                                        }
                                        
                                        elasticache.describeCacheClusters({
                                            CacheClusterId: clusterId,
                                            ShowCacheNodeInfo: true
                                        }, (detailErr, detailData) => {
                                            if (!detailErr && detailData && detailData.CacheClusters && 
                                                detailData.CacheClusters.length > 0) {
                                                
                                                const detailedCluster = detailData.CacheClusters[0];
                                                
                                                // Try to get endpoints
                                                try {
                                                    if (detailedCluster.ConfigurationEndpoint && 
                                                        detailedCluster.ConfigurationEndpoint.Address) {
                                                        
                                                        valkeyClusterMap[clusterId].endpoint = 
                                                            `${detailedCluster.ConfigurationEndpoint.Address}:${detailedCluster.ConfigurationEndpoint.Port}`;
                                                        valkeyClusterMap[clusterId].port = 
                                                            detailedCluster.ConfigurationEndpoint.Port;
                                                            
                                                    } else if (detailedCluster.CacheNodes && 
                                                               detailedCluster.CacheNodes.length > 0 && 
                                                               detailedCluster.CacheNodes[0].Endpoint) {
                                                        
                                                        valkeyClusterMap[clusterId].endpoint = 
                                                            `${detailedCluster.CacheNodes[0].Endpoint.Address}:${detailedCluster.CacheNodes[0].Endpoint.Port}`;
                                                        valkeyClusterMap[clusterId].port = 
                                                            detailedCluster.CacheNodes[0].Endpoint.Port;
                                                    }
                                                } catch (endpointErr) {
                                                    console.log(`Error getting endpoint for ${clusterId}:`, endpointErr);
                                                }
                                            }
                                            resolve();
                                        });
                                    });
                                });
                                
                                // Get replication group details
                                const rgPromise = new Promise((resolve) => {
                                    if (valkeyRgIds.size === 0) {
                                        resolve([]);
                                        return;
                                    }
                                    
                                    elasticache.describeReplicationGroups({}, (rgErr, rgData) => {
                                        if (rgErr || !rgData || !rgData.ReplicationGroups) {
                                            console.error("Error loading replication groups:", rgErr);
                                            resolve([]);
                                            return;
                                        }
                                        
                                        // Filter to Valkey replication groups
                                        const valkeyRgs = rgData.ReplicationGroups.filter(rg => 
                                            rg.Engine === 'valkey' || valkeyRgIds.has(rg.ReplicationGroupId)
                                        );
                                        
                                        console.log(`Found ${valkeyRgs.length} matching Valkey replication groups`);
                                        resolve(valkeyRgs);
                                    });
                                });
                                
                                // Wait for all data gathering to complete
                                Promise.all([...clusterDetailsPromises, rgPromise]).then(results => {
                                    this.loading = false;
                                    
                                    // Last item in results is the array of replication groups
                                    const replicationGroups = results[results.length - 1] || [];
                                    
                                    // Convert replication groups to resources
                                    const rgResources = replicationGroups.map(rg => {
                                        // Find the primary endpoint if available
                                        let primaryEndpoint = '-';
                                        let readerEndpoint = '-';
                                        let port = '-';
                                        
                                        try {
                                            if (rg.NodeGroups && rg.NodeGroups.length > 0) {
                                                const nodeGroup = rg.NodeGroups[0];
                                                
                                                if (nodeGroup.PrimaryEndpoint && nodeGroup.PrimaryEndpoint.Address) {
                                                    primaryEndpoint = `${nodeGroup.PrimaryEndpoint.Address}:${nodeGroup.PrimaryEndpoint.Port}`;
                                                    port = nodeGroup.PrimaryEndpoint.Port;
                                                }
                                                
                                                if (nodeGroup.ReaderEndpoint && nodeGroup.ReaderEndpoint.Address) {
                                                    readerEndpoint = `${nodeGroup.ReaderEndpoint.Address}:${nodeGroup.ReaderEndpoint.Port}`;
                                                }
                                            }
                                        } catch (epErr) {
                                            console.log(`Error getting endpoints for RG ${rg.ReplicationGroupId}:`, epErr);
                                        }
                                        
                                        // Get node type and other info from member clusters if needed
                                        let nodeType = '-';
                                        let engineVersion = '-';
                                        let subnetGroup = '-';
                                        
                                        if (rg.MemberClusters && rg.MemberClusters.length > 0) {
                                            // Check if we have any of these member clusters in our map
                                            for (const memberId of rg.MemberClusters) {
                                                if (valkeyClusterMap[memberId]) {
                                                    const memberData = valkeyClusterMap[memberId];
                                                    nodeType = memberData.nodeType;
                                                    engineVersion = memberData.engineVersion;
                                                    subnetGroup = memberData.vpcId;
                                                    break;
                                                }
                                            }
                                        }
                                        
                                        return {
                                            id: rg.ReplicationGroupId,
                                            name: rg.ReplicationGroupId,
                                            description: rg.Description || '-',
                                            status: rg.Status,
                                            nodeType: rg.CacheNodeType || nodeType,
                                            engine: 'valkey',
                                            engineVersion: rg.EngineVersion || engineVersion,
                                            multiAZ: rg.MultiAZ ? 'Yes' : 'No',
                                            numNodes: rg.MemberClusters ? rg.MemberClusters.length : 0,
                                            primaryEndpoint: primaryEndpoint,
                                            readerEndpoint: readerEndpoint,
                                            port: port,
                                            vpcId: subnetGroup,
                                            data: rg
                                        };
                                    });
                                    
                                    // Get standalone (non-replication group) clusters
                                    const standaloneResources = Object.values(valkeyClusterMap)
                                        .filter(cluster => !cluster.rgId);
                                    
                                    // Final resources
                                    this.resources = [...rgResources, ...standaloneResources];
                                    console.log(`Final Valkey resources: ${this.resources.length}`);
                                }).catch(err => {
                                    this.loading = false;
                                    console.error("Error processing Valkey data:", err);
                                    
                                    // Show whatever clusters we found
                                    const allClusters = Object.values(valkeyClusterMap);
                                    this.resources = allClusters;
                                });
                            } catch (processErr) {
                                this.loading = false;
                                console.error("Error processing Valkey clusters:", processErr);
                                this.resources = [];
                            }
                        });
                    } catch (outerErr) {
                        this.loading = false;
                        console.error("Critical error loading Valkey clusters:", outerErr);
                        this.resources = [];
                    }
                },
                
                // Helper methods for finding details from cache clusters
                findNodeTypeFromClusters: function(cacheClusters, clusterId) {
                    if (!cacheClusters || !clusterId) return '-';
                    const cluster = cacheClusters.find(c => c.CacheClusterId === clusterId);
                    return cluster ? cluster.CacheNodeType : '-';
                },
                
                findEngineVersionFromClusters: function(cacheClusters, clusterId) {
                    if (!cacheClusters || !clusterId) return '-';
                    const cluster = cacheClusters.find(c => c.CacheClusterId === clusterId);
                    return cluster ? cluster.EngineVersion : '-';
                },
                
                findSubnetGroupFromClusters: function(cacheClusters, clusterId) {
                    if (!cacheClusters || !clusterId) return '-';
                    const cluster = cacheClusters.find(c => c.CacheClusterId === clusterId);
                    return cluster ? cluster.CacheSubnetGroupName : '-';
                },
                
                // Load additional details for Valkey clusters
                loadValkeyClustersDetails: function(clusters) {
                    const elasticache = new AWS.ElastiCache();
                    
                    // Create promises for each cluster's detailed information
                    const promises = clusters.map(cluster => {
                        return new Promise((resolve) => {
                            if (!cluster.id || !cluster.data.MemberClusters || cluster.data.MemberClusters.length === 0) {
                                resolve(cluster);
                                return;
                            }
                            
                            // Get details of the first member cluster to extract node type and other details
                            elasticache.describeCacheClusters({
                                CacheClusterId: cluster.data.MemberClusters[0],
                                ShowCacheNodeInfo: true
                            }, (err, data) => {
                                if (!err && data.CacheClusters && data.CacheClusters.length > 0) {
                                    const cacheCluster = data.CacheClusters[0];
                                    cluster.nodeType = cacheCluster.CacheNodeType;
                                    cluster.engineVersion = cacheCluster.EngineVersion;
                                    cluster.vpcId = cacheCluster.CacheSubnetGroupName || '-';
                                }
                                resolve(cluster);
                            });
                        });
                    });
                    
                    // When all promises are resolved, update the resources
                    Promise.all(promises).then(updatedClusters => {
                        this.resources = updatedClusters;
                    }).catch(error => {
                        console.error("Error loading Valkey cluster details:", error);
                        this.resources = clusters; // Use original data if there was an error
                    });
                },
                
                // Subnet groups resource loading
                loadSubnetGroupsResources: function() {
                    const elasticache = new AWS.ElastiCache();
                    const rds = new AWS.RDS();
                    
                    // Use BatchTool to load both ElastiCache and RDS subnet groups
                    Promise.all([
                        // ElastiCache subnet groups
                        new Promise((resolve) => {
                            elasticache.describeCacheSubnetGroups({}, (err, data) => {
                                if (err) {
                                    console.error("Error loading ElastiCache subnet groups:", err);
                                    resolve([]);
                                    return;
                                }
                                
                                const groups = data.CacheSubnetGroups ? data.CacheSubnetGroups.map(group => {
                                    return {
                                        id: group.CacheSubnetGroupName,
                                        name: group.CacheSubnetGroupName,
                                        description: group.CacheSubnetGroupDescription,
                                        vpcId: group.VpcId,
                                        type: 'ElastiCache',
                                        subnets: group.Subnets ? group.Subnets.map(subnet => subnet.SubnetIdentifier).join(', ') : '',
                                        data: group
                                    };
                                }) : [];
                                
                                resolve(groups);
                            });
                        }),
                        
                        // RDS subnet groups
                        new Promise((resolve) => {
                            rds.describeDBSubnetGroups({}, (err, data) => {
                                if (err) {
                                    console.error("Error loading RDS subnet groups:", err);
                                    resolve([]);
                                    return;
                                }
                                
                                const groups = data.DBSubnetGroups ? data.DBSubnetGroups.map(group => {
                                    return {
                                        id: group.DBSubnetGroupName,
                                        name: group.DBSubnetGroupName,
                                        description: group.DBSubnetGroupDescription,
                                        vpcId: group.VpcId,
                                        type: 'RDS',
                                        subnets: group.Subnets ? group.Subnets.map(subnet => subnet.SubnetIdentifier).join(', ') : '',
                                        status: group.SubnetGroupStatus,
                                        data: group
                                    };
                                }) : [];
                                
                                resolve(groups);
                            });
                        })
                    ]).then(results => {
                        // Combine ElastiCache and RDS subnet groups
                        const elastiCacheGroups = results[0];
                        const rdsGroups = results[1];
                        this.resources = [...elastiCacheGroups, ...rdsGroups];
                        this.loading = false;
                    });
                },
                
                // Copy text to clipboard
                copyToClipboard: function(text) {
                    navigator.clipboard.writeText(text)
                        .then(() => {
                            alert('Copied to clipboard!');
                        })
                        .catch(err => {
                            console.error('Could not copy text: ', err);
                            
                            // Fallback for older browsers
                            const textarea = document.createElement('textarea');
                            textarea.value = text;
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                            alert('Copied to clipboard!');
                        });
                },
                
                // Download Terraform code as a file
                downloadTerraformCode: function() {
                    const filename = `${this.selectedInstance.id.replace(/-/g, '_')}_instance.tf`;
                    const blob = new Blob([this.instanceTerraformCode], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    
                    URL.revokeObjectURL(url);
                },
                
                // Sort data by column
                sortBy: function(key) {
                    if (this.sortKey === key) {
                        // If already sorting by this key, toggle order
                        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                    } else {
                        // New sort key, default to ascending
                        this.sortKey = key;
                        this.sortOrder = 'asc';
                    }
                },
                
                // Format date for display
                formatDate: function(dateString) {
                    if (!dateString) return '-';
                    const date = new Date(dateString);
                    return date.toLocaleString();
                },
                
                // Toggle EC2 resources submenu
                toggleServiceExpand: function(service) {
                    service.expanded = !service.expanded;
                },
                
                // Extract username from ARN
                getUsernameFromArn: function() {
                    if (!this.identityInfo) return '';
                    
                    // Handle different ARN formats
                    if (this.identityInfo.includes('user/')) {
                        // IAM user format: arn:aws:iam::123456789012:user/username
                        const parts = this.identityInfo.split('user/');
                        return parts.length > 1 ? parts[1] : 'AWS User';
                    } else if (this.identityInfo.includes('assumed-role/')) {
                        // Role format: arn:aws:sts::123456789012:assumed-role/rolename/session
                        const parts = this.identityInfo.split('assumed-role/');
                        if (parts.length > 1) {
                            const roleParts = parts[1].split('/');
                            return roleParts.length > 1 ? `${roleParts[0]} (${roleParts[1]})` : roleParts[0];
                        }
                        return 'AWS Role';
                    } else if (this.identityInfo.includes(':root')) {
                        // Root account: arn:aws:iam::123456789012:root
                        return 'Root Account';
                    }
                    
                    // Other formats (fallback)
                    return 'AWS Account';
                },
                
                // Set up AWS SDK request monitoring
                setupAwsSdkMonitoring: function() {
                    // Store reference to Vue component
                    const self = this;
                    
                    // Skip if AWS SDK is not available
                    if (!AWS || !AWS.events) {
                        console.warn('AWS SDK not available for monitoring');
                        return;
                    }
                    
                    // Monitor when a request is about to be sent
                    AWS.events.on('send', function(resp) {
                        self.apiCallCounter++;
                        self.apiLoading = true;
                        console.log(`AWS API call started (${self.apiCallCounter} active): ${resp.operation}`);
                    });
                    
                    // Monitor when a response is received
                    AWS.events.on('complete', function(resp) {
                        self.apiCallCounter--;
                        // Only hide the loading overlay when all calls are done
                        if (self.apiCallCounter <= 0) {
                            self.apiCallCounter = 0; // Ensure it doesn't go negative
                            self.apiLoading = false;
                            console.log('All AWS API calls completed');
                        } else {
                            console.log(`AWS API call completed (${self.apiCallCounter} remaining)`);
                        }
                    });
                    
                    // Also handle errors (which may not trigger 'complete')
                    AWS.events.on('error', function(err) {
                        self.apiCallCounter--;
                        if (self.apiCallCounter <= 0) {
                            self.apiCallCounter = 0;
                            self.apiLoading = false;
                            console.log('AWS API call error, all calls completed');
                        }
                    });
                },
                
                // Make modals draggable
                initDraggableModals: function() {
                    const self = this;
                    
                    // Add event listener to all modal title bars
                    document.addEventListener('mousedown', function(e) {
                        // Check if clicked element is a modal title bar
                        if (e.target.closest('.window-title')) {
                            const titleBar = e.target.closest('.window-title');
                            const modal = titleBar.closest('.modal-content');
                            
                            if (!modal) return;
                            
                            // Get the initial mouse position
                            const startX = e.clientX;
                            const startY = e.clientY;
                            
                            // Get the initial modal position
                            const initialLeft = modal.offsetLeft;
                            const initialTop = modal.offsetTop;
                            
                            // Function to handle mouse movement
                            function handleMouseMove(e) {
                                // Calculate new position
                                const dx = e.clientX - startX;
                                const dy = e.clientY - startY;
                                
                                // Update modal position
                                modal.style.position = 'absolute';
                                modal.style.left = `${initialLeft + dx}px`;
                                modal.style.top = `${initialTop + dy}px`;
                            }
                            
                            // Function to handle mouse up
                            function handleMouseUp() {
                                // Remove event listeners
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                            }
                            
                            // Add event listeners
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                        }
                    });
                    
                    // Initialize resize observer to adjust content when modal is resized
                    if (typeof ResizeObserver !== 'undefined') {
                        const resizeObserver = new ResizeObserver(entries => {
                            for (const entry of entries) {
                                // When modal is resized, make sure content adapts
                                const modalContent = entry.target;
                                const windowBody = modalContent.querySelector('.window-body');
                                if (windowBody) {
                                    // Make sure body fills available space
                                    windowBody.style.height = 'calc(100% - 24px)';
                                }
                            }
                        });
                        
                        // Observe all modal content elements
                        document.querySelectorAll('.modal-content').forEach(modal => {
                            resizeObserver.observe(modal);
                        });
                    }
                }
            },
            created: function() {
                // Check if we have stored credentials on page load
                if (this.loadFromSessionStorage()) {
                    // If we loaded credentials successfully, load the default service
                    this.selectService('ec2_instances');
                    // Expand the EC2 Resources menu by default
                    const ec2Resources = this.services.find(s => s.id === 'ec2_resources');
                    if (ec2Resources) {
                        ec2Resources.expanded = true;
                    }
                } else {
                    // Otherwise, show the login modal
                    this.showCredentialsModal = true;
                }
            },
            
            updated: function() {
                // Ensure any new modals that appear are draggable and resizable
                this.initDraggableModals();
            },
            computed: {
                // Filtered and sorted resources
                filteredResources: function() {
                    let result = [...this.resources];
                    
                    // Apply search filter if query exists
                    if (this.searchQuery) {
                        const query = this.searchQuery.toLowerCase();
                        result = result.filter(resource => {
                            return Object.values(resource).some(value => {
                                if (value === null || value === undefined) return false;
                                if (typeof value === 'object') return false;
                                return String(value).toLowerCase().includes(query);
                            });
                        });
                    }
                    
                    // Sort results
                    if (this.sortKey) {
                        const key = this.sortKey;
                        const order = this.sortOrder === 'asc' ? 1 : -1;
                        
                        result.sort((a, b) => {
                            // Special case for date sorting
                            if (key === 'launchTime') {
                                const dateA = a[key] ? new Date(a[key]) : new Date(0);
                                const dateB = b[key] ? new Date(b[key]) : new Date(0);
                                return (dateA - dateB) * order;
                            }
                            
                            // Default string comparison
                            const valueA = a[key] !== undefined ? String(a[key]).toLowerCase() : '';
                            const valueB = b[key] !== undefined ? String(b[key]).toLowerCase() : '';
                            
                            if (valueA < valueB) return -1 * order;
                            if (valueA > valueB) return 1 * order;
                            return 0;
                        });
                    }
                    
                    return result;
                }
            }
        });
