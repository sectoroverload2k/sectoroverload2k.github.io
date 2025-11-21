# Project Notes

## Project Overview
- AWS Terraform Exporter tool
- Web UI for browsing and exporting AWS resources to Terraform format
- Vue.js frontend with AWS SDK for JavaScript
- Resource browser with sortable, filterable tables
- Windows 98-style UI theme using 98.css with Bootstrap CSS

## Key Features
- AWS resource visualization with authentication via STS
- Session storage for maintaining login state
- Browser-side caching for performance
- Resource reference system with tooltips
- Terraform code generation
- Detail modals for resources (EC2, RDS)

## UI Components
- Resource tables with sortable columns
- Resource tooltips showing related information
- Tab-based detail modals
- Status indicators with color coding

## Code Standards
- VPC references should show VPC name with tooltips containing ID and CIDR blocks
- Maintain consistent UI patterns across all resource types
- Cache resources to improve performance
- Use consistent tooltip formatting

## Project Structure
- Single-file application (index.php) containing HTML, CSS, and Vue.js code
- Organized into Vue components and methods

## Common Tasks
- VPC reference pattern:
  ```javascript
  <span v-if="resource.vpcId" class="resource-ref">
      {{ resource.vpcName }}
      <div class="resource-tooltip">
          <div class="resource-id">{{ resource.vpcId }}</div>
          <div v-if="getResourceDetails(resource.vpcId) && getResourceDetails(resource.vpcId).details" 
               class="resource-details">{{ getResourceDetails(resource.vpcId).details }}</div>
      </div>
  </span>
  <span v-else>-</span>
  ```
- Resource loading pattern:
  ```javascript
  loadResourcesFunction: function() {
      // Ensure VPC cache is loaded
      ensureVPCCache();
      
      // Load resources from AWS API
      // Enhance with cached information
      // Cache results
  }
  ```

## Notes
- Keep responses short and to the point
- Favor parallel tool usage with BatchTool
- Update CLAUDE.md with new discoveries and requirements
- Focus on implementing features exactly as requested