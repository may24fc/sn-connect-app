#!/bin/bash

# Vercel Setup and Deployment Script for HR Portal
# This script guides you through the complete Vercel deployment setup

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  ${1}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main script
main() {
    print_header "Vercel Deployment Setup for HR Portal"

    # Step 1: Check Vercel CLI
    print_info "Step 1: Checking Vercel CLI installation..."
    if command_exists vercel; then
        VERCEL_VERSION=$(vercel --version)
        print_success "Vercel CLI is installed (version: $VERCEL_VERSION)"
    else
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel@latest
        print_success "Vercel CLI installed successfully"
    fi

    # Step 2: Login to Vercel
    print_header "Step 2: Vercel Authentication"
    print_info "Please login to Vercel. This will open your browser."
    read -p "Press ENTER to continue..."

    vercel login
    print_success "Logged in to Vercel"

    # Step 3: Link Project
    print_header "Step 3: Link Project to Vercel"
    print_info "This will create a new Vercel project or link to an existing one."
    print_warning "When prompted:"
    echo "  - Set up and deploy: Yes"
    echo "  - Which scope: Select your team/account"
    echo "  - Link to existing project: No (or Yes if it exists)"
    echo "  - Project name: sn-hr-portal (or your choice)"
    echo "  - Directory: ./ (root)"
    echo ""
    read -p "Press ENTER to continue..."

    # Navigate to root and link
    vercel link

    print_success "Project linked to Vercel"

    # Step 4: Extract Project IDs
    print_header "Step 4: Extract Project Configuration"

    if [ -f ".vercel/project.json" ]; then
        print_success "Found .vercel/project.json"

        # Extract IDs using jq if available, otherwise use basic parsing
        if command_exists jq; then
            ORG_ID=$(jq -r '.orgId' .vercel/project.json)
            PROJECT_ID=$(jq -r '.projectId' .vercel/project.json)
        else
            ORG_ID=$(grep -o '"orgId":"[^"]*' .vercel/project.json | cut -d'"' -f4)
            PROJECT_ID=$(grep -o '"projectId":"[^"]*' .vercel/project.json | cut -d'"' -f4)
        fi

        print_success "Project configuration extracted:"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "SAVE THESE VALUES - You'll need them for GitHub Secrets:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "VERCEL_ORG_ID=$ORG_ID"
        echo "VERCEL_PROJECT_ID=$PROJECT_ID"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""

        # Save to a file for reference
        cat > .vercel-ids.txt <<EOF
# Vercel Project IDs
# Add these to your GitHub repository secrets

VERCEL_ORG_ID=$ORG_ID
VERCEL_PROJECT_ID=$PROJECT_ID

# Next step: Get your VERCEL_TOKEN from:
# https://vercel.com/account/tokens
EOF
        print_success "IDs saved to .vercel-ids.txt for your reference"
    else
        print_error "Could not find .vercel/project.json. Project linking may have failed."
        exit 1
    fi

    # Step 5: Get Vercel Token
    print_header "Step 5: Generate Vercel Token"
    print_info "You need to create a Vercel API token for GitHub Actions."
    echo ""
    echo "1. Visit: https://vercel.com/account/tokens"
    echo "2. Click 'Create Token'"
    echo "3. Name it: 'GitHub Actions Deploy'"
    echo "4. Select scope: Full Account"
    echo "5. Copy the token (shown only once!)"
    echo ""
    read -p "Press ENTER when you have your token..."

    # Step 6: Environment Variables Guide
    print_header "Step 6: Configure Environment Variables"
    print_info "You need to add environment variables to Vercel."
    echo ""
    echo "Option A: Using Vercel CLI (Recommended)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Run these commands one by one:"
    echo ""
    echo "  vercel env add NEXT_PUBLIC_SUPABASE_URL"
    echo "  vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  vercel env add SUPABASE_SERVICE_ROLE_KEY"
    echo "  vercel env add ANTHROPIC_API_KEY"
    echo "  vercel env add JWT_SECRET"
    echo "  vercel env add N8N_WEBHOOK_URL"
    echo "  vercel env add N8N_API_KEY"
    echo ""
    echo "For each command:"
    echo "  - Paste the value when prompted"
    echo "  - Select environments (Production, Preview, Development)"
    echo ""
    echo "Option B: Using Vercel Dashboard"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Visit: https://vercel.com/dashboard"
    echo "2. Select your project: sn-hr-portal"
    echo "3. Go to: Settings → Environment Variables"
    echo "4. Add each variable from .env.vercel.example"
    echo ""
    read -p "Would you like to add environment variables now via CLI? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Adding environment variables..."

        # Public variables
        print_info "Adding NEXT_PUBLIC_SUPABASE_URL..."
        vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development || true

        print_info "Adding NEXT_PUBLIC_SUPABASE_ANON_KEY..."
        vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview development || true

        # Secret variables
        print_info "Adding SUPABASE_SERVICE_ROLE_KEY..."
        vercel env add SUPABASE_SERVICE_ROLE_KEY production || true

        print_info "Adding ANTHROPIC_API_KEY..."
        vercel env add ANTHROPIC_API_KEY production || true

        print_info "Adding JWT_SECRET..."
        vercel env add JWT_SECRET production preview development || true

        print_info "Adding N8N_WEBHOOK_URL..."
        vercel env add N8N_WEBHOOK_URL production || true

        print_info "Adding N8N_API_KEY..."
        vercel env add N8N_API_KEY production || true

        print_success "Environment variables added!"
    else
        print_warning "Skipping environment variable setup. Remember to add them before deploying!"
    fi

    # Step 7: Test Deployment
    print_header "Step 7: Test Deployment"
    print_info "Ready to deploy a preview version to test?"
    echo ""
    read -p "Deploy to preview environment? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deploying to preview..."
        PREVIEW_URL=$(vercel --yes)
        print_success "Preview deployed successfully!"
        echo ""
        echo "Preview URL: $PREVIEW_URL"
        echo ""
        print_info "Test your deployment:"
        echo "  - Check if the app loads"
        echo "  - Verify Supabase connection"
        echo "  - Test authentication"
        echo "  - Check API routes"
        echo ""
    else
        print_warning "Skipping preview deployment."
        echo "You can deploy later with: vercel"
    fi

    # Step 8: Production Deployment
    print_header "Step 8: Production Deployment (Optional)"
    print_info "Deploy to production?"
    echo ""
    print_warning "Only deploy to production after thoroughly testing preview!"
    echo ""
    read -p "Deploy to production now? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deploying to production..."
        PROD_URL=$(vercel --prod --yes)
        print_success "Production deployed successfully!"
        echo ""
        echo "Production URL: $PROD_URL"
        echo ""
    else
        print_info "Skipping production deployment."
        echo "You can deploy later with: vercel --prod"
    fi

    # Final Summary
    print_header "Setup Complete!"
    print_success "Vercel deployment is configured!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "NEXT STEPS:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Add GitHub Secrets (Required for CI/CD):"
    echo "   Go to: GitHub Repo → Settings → Secrets → Actions"
    echo ""
    echo "   Add these secrets:"
    echo "   - VERCEL_TOKEN (from Step 5)"
    echo "   - VERCEL_ORG_ID (from .vercel-ids.txt)"
    echo "   - VERCEL_PROJECT_ID (from .vercel-ids.txt)"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - ANTHROPIC_API_KEY"
    echo "   - JWT_SECRET"
    echo "   - N8N_WEBHOOK_URL"
    echo "   - N8N_API_KEY"
    echo ""
    echo "   Add these variables (not secret):"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo ""
    echo "2. Test GitHub Actions:"
    echo "   - Push to master branch triggers production deploy"
    echo "   - Create PR triggers preview deploy"
    echo ""
    echo "3. Configure Custom Domain (Optional):"
    echo "   - Vercel Dashboard → Project → Settings → Domains"
    echo ""
    echo "4. Enable Analytics (Optional):"
    echo "   - Add @vercel/analytics to apps/web"
    echo "   - Add <Analytics /> to layout.tsx"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📚 Documentation:"
    echo "   - Full guide: VERCEL_DEPLOYMENT.md"
    echo "   - Project IDs: .vercel-ids.txt"
    echo "   - Env template: .env.vercel.example"
    echo ""
    print_success "Happy deploying! 🚀"
    echo ""
}

# Run main function
main
