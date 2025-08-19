"""
Grocery Shopping Dataset Generator
==================================

This script generates a realistic, simulated dataset for a grocery shopping application
using pandas, Faker, and OpenAI API for dynamic product catalog generation.

Requirements:
- pandas
- faker
- openai
- Set OPENAI_API_KEY environment variable

Usage:
    export OPENAI_API_KEY="your-api-key-here"
    python grocery_dataset_generator.py
"""

import pandas as pd
import numpy as np
from faker import Faker
import json
import os
import random
from datetime import datetime, timedelta
from openai import OpenAI

# Initialize Faker
fake = Faker()
Faker.seed(42)  # For reproducibility
np.random.seed(42)
random.seed(42)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def generate_products_via_api(products_per_category=100, batch_size=30, similar_batch_pct=0.6, similar_subset_pct=0.4):
    """
    Generate product catalog using OpenAI API with structured output and similar products
    
    Args:
        products_per_category (int): Number of products to generate per category
        batch_size (int): Number of products to generate in each API call
        similar_batch_pct (float): Percentage of each batch to create similar products for (0.6 = 60%)
        similar_subset_pct (float): Percentage of selected products to create similar variants for (0.4 = 40%)
    
    Returns: DataFrame with product information and substitution tracking
    """
    print(f"Generating products via OpenAI API ({products_per_category} per category, batch size {batch_size})")
    print(f"Similar products: {similar_batch_pct*100:.0f}% of batch, {similar_subset_pct*100:.0f}% get variants")
    
    categories = ['Produce', 'Dairy', 'Bakery', 'Meat & Seafood', 'Pantry Staples', 'Snacks', 'Beverages', 'Household']
    all_products = []
    substitution_map = {}  # Maps original product_id to list of similar product_ids
    product_id_counter = 1
    
    for category in categories:
        print(f"  Generating {products_per_category} products for category: {category}")
        category_products = []
        
        # Generate products in batches
        for batch_start in range(0, products_per_category, batch_size):
            remaining_in_category = products_per_category - len(category_products)
            current_batch_size = min(batch_size, remaining_in_category)
            
            if current_batch_size <= 0:
                break
            
            print(f"    Batch {batch_start // batch_size + 1}: Generating {current_batch_size} products...")
            
            try:
                # Generate base products first
                base_products = generate_base_products_batch(category, current_batch_size, product_id_counter)
                
                if not base_products:
                    continue
                
                # Add base products to our list
                category_products.extend(base_products)
                base_product_ids = [p['product_id'] for p in base_products]
                product_id_counter += len(base_products)
                
                # Generate similar products
                similar_products, new_substitution_map = generate_similar_products(
                    base_products, 
                    product_id_counter, 
                    similar_batch_pct, 
                    similar_subset_pct
                )
                
                if similar_products:
                    category_products.extend(similar_products)
                    substitution_map.update(new_substitution_map)
                    product_id_counter += len(similar_products)
                    
                    print(f"    Generated {len(base_products)} base + {len(similar_products)} similar products")
                else:
                    print(f"    Generated {len(base_products)} products")
                
            except Exception as e:
                print(f"    Error in batch generation for {category}: {e}")
                # Generate fallback products for this batch
                fallback_products = generate_fallback_batch(category, current_batch_size, product_id_counter)
                category_products.extend(fallback_products)
                product_id_counter += len(fallback_products)
        
        all_products.extend(category_products)
        print(f"  Completed {category}: {len(category_products)} total products generated")
    
    # Create DataFrame
    products_df = pd.DataFrame(all_products)
    
    # Reorder columns
    column_order = ['product_id', 'product_name', 'category', 'brand', 'size', 'unit', 'price_per_unit']
    products_df = products_df[column_order]
    
    # Store substitution map globally for use in order_items generation
    global SUBSTITUTION_MAP
    SUBSTITUTION_MAP = substitution_map
    
    print(f"Successfully generated {len(products_df)} total products with {len(substitution_map)} substitution groups")
    return products_df

def generate_base_products_batch(category, batch_size, start_id):
    """
    Generate base products for a category using OpenAI API
    """
    try:
        # Create structured output schema
        response = client.chat.completions.create(
            model="gpt-4.1-nano",
            messages=[
                {
                    "role": "system", 
                    "content": "You are a helpful assistant that generates realistic grocery store product data. Always respond with valid JSON only."
                },
                {
                    "role": "user",
                    "content": f"""Generate exactly {batch_size} realistic grocery store products for the category "{category}".

IMPORTANT: Your response must be ONLY a valid JSON array. Do not include any text outside the JSON.

Each product object must have these exact keys:
- "product_name": A realistic product name (string)
- "brand": A realistic brand name (string) 
- "size": Product size with number (string, e.g., "16 oz", "1 lb", "500g")
- "unit": Unit of measurement (string, e.g., "oz", "lb", "g", "ml", "count", "each")
- "price_per_unit": Price per unit as a decimal number (float, e.g., 3.99, 12.50)

Make products diverse and realistic for the {category} category. Ensure price_per_unit reflects realistic grocery store prices.

Example format:
[
  {{"product_name": "Fresh Organic Bananas", "brand": "Whole Foods", "size": "1 lb", "unit": "lb", "price_per_unit": 1.99}},
  {{"product_name": "Honeycrisp Apples", "brand": "Local Farm", "size": "3 lb", "unit": "lb", "price_per_unit": 4.99}}
]"""
                }
            ],
            max_tokens=2000,
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        # Parse the JSON response
        content = response.choices[0].message.content.strip()
        
        # Handle the case where the model might wrap the array in an object
        try:
            parsed_content = json.loads(content)
            if isinstance(parsed_content, dict) and 'products' in parsed_content:
                batch_products = parsed_content['products']
            elif isinstance(parsed_content, dict) and len(parsed_content) == 1:
                # If it's a dict with one key, try to extract the array value
                batch_products = list(parsed_content.values())[0]
            elif isinstance(parsed_content, list):
                batch_products = parsed_content
            else:
                raise ValueError("Unexpected JSON structure")
        except json.JSONDecodeError:
            # Try to extract JSON array from the content
            if '[' in content and ']' in content:
                start = content.find('[')
                end = content.rfind(']') + 1
                batch_products = json.loads(content[start:end])
            else:
                raise
        
        # Validate and add products
        valid_products = []
        for i, product in enumerate(batch_products):
            if all(key in product for key in ['product_name', 'brand', 'size', 'unit', 'price_per_unit']):
                product['category'] = category
                product['product_id'] = start_id + i
                valid_products.append(product)
        
        return valid_products[:batch_size]  # Ensure we don't exceed batch size
        
    except Exception as e:
        print(f"    API call failed: {e}")
        return generate_fallback_batch(category, batch_size, start_id)

def generate_similar_products(base_products, start_id, similar_batch_pct, similar_subset_pct):
    """
    Generate similar products based on base products
    
    Args:
        base_products: List of base product dictionaries
        start_id: Starting product ID for similar products
        similar_batch_pct: Percentage of batch to select for similarity
        similar_subset_pct: Percentage of selected products to create variants for
    
    Returns:
        Tuple of (similar_products_list, substitution_map)
    """
    if not base_products:
        return [], {}
    
    # Step 1: Select products from batch based on similar_batch_pct
    batch_selection_count = max(1, int(len(base_products) * similar_batch_pct))
    selected_for_similarity = random.sample(base_products, min(batch_selection_count, len(base_products)))
    
    # Step 2: From selected products, choose which ones get similar variants
    variant_count = max(1, int(len(selected_for_similarity) * similar_subset_pct))
    products_getting_variants = random.sample(selected_for_similarity, min(variant_count, len(selected_for_similarity)))
    
    similar_products = []
    substitution_map = {}
    current_id = start_id
    
    for base_product in products_getting_variants:
        # Create 1-2 similar variants per selected product
        num_variants = random.choice([1, 2])
        variant_ids = []
        
        for _ in range(num_variants):
            similar_product = create_similar_product(base_product, current_id)
            similar_products.append(similar_product)
            variant_ids.append(current_id)
            current_id += 1
        
        # Map original product to its variants
        substitution_map[base_product['product_id']] = variant_ids
    
    return similar_products, substitution_map

def create_similar_product(base_product, new_id):
    """
    Create a similar product by slightly modifying the base product
    """
    similar_product = base_product.copy()
    similar_product['product_id'] = new_id
    
    # Modify different aspects randomly
    modifications = []
    
    # 70% chance to modify brand
    if random.random() < 0.7:
        brand_variants = {
            'Whole Foods': ['365 Everyday Value', 'Whole Foods Market'],
            'Great Value': ['Walmart', 'Equate'],
            'Kroger': ['Simple Truth', 'Private Selection'],
            'Target': ['Good & Gather', 'Market Pantry'],
            'Safeway': ['O Organics', 'Signature Select']
        }
        
        current_brand = similar_product['brand']
        if current_brand in brand_variants:
            similar_product['brand'] = random.choice(brand_variants[current_brand])
        else:
            # Generic brand alternatives
            generic_brands = ['Store Brand', 'Value Brand', 'Premium Choice', 'Fresh Select']
            similar_product['brand'] = random.choice(generic_brands)
        modifications.append('brand')
    
    # 60% chance to modify size
    if random.random() < 0.6:
        current_size = similar_product['size']
        unit = similar_product['unit']
        
        # Extract number from size
        size_parts = current_size.split()
        if size_parts and size_parts[0].replace('.', '').isdigit():
            current_amount = float(size_parts[0])
            
            # Vary size by ±20-50%
            variation_factor = random.uniform(0.8, 1.5)
            new_amount = round(current_amount * variation_factor, 1)
            
            # Keep it reasonable
            if new_amount > 0.1:
                similar_product['size'] = f"{new_amount} {' '.join(size_parts[1:])}"
                modifications.append('size')
    
    # 80% chance to modify price (usually within ±30%)
    if random.random() < 0.8:
        current_price = similar_product['price_per_unit']
        price_variation = random.uniform(0.7, 1.3)
        new_price = round(current_price * price_variation, 2)
        similar_product['price_per_unit'] = max(0.99, new_price)  # Minimum price
        modifications.append('price')
    
    # 30% chance to slightly modify product name
    if random.random() < 0.3:
        name_modifiers = ['Premium', 'Organic', 'Natural', 'Fresh', 'Classic', 'Original', 'Extra']
        current_name = similar_product['product_name']
        
        # Add a modifier if it's not already there
        modifier = random.choice(name_modifiers)
        if modifier.lower() not in current_name.lower():
            similar_product['product_name'] = f"{modifier} {current_name}"
            modifications.append('name')
    
    return similar_product

def generate_fallback_batch(category, batch_size, start_id):
    """
    Generate fallback products when API fails
    """
    brands = {
        'Produce': ['Fresh Market', 'Organic Valley', 'Local Farm', 'Green Choice'],
        'Dairy': ['Horizon', 'Land O Lakes', 'Great Value', 'Organic Valley'],
        'Bakery': ['Pepperidge Farm', 'Wonder', 'Sara Lee', 'King Hawaiian'],
        'Meat & Seafood': ['Tyson', 'Perdue', 'Wild Planet', 'Oscar Mayer'],
        'Pantry Staples': ['Hunt\'s', 'Kraft', 'General Mills', 'Quaker'],
        'Snacks': ['Lay\'s', 'Cheetos', 'Oreo', 'Nabisco'],
        'Beverages': ['Coca-Cola', 'Pepsi', 'Tropicana', 'Nestlé'],
        'Household': ['Tide', 'Charmin', 'Bounty', 'Dawn']
    }
    
    products = []
    for i in range(batch_size):
        brand = random.choice(brands.get(category, ['Generic Brand']))
        
        if category == 'Produce':
            items = ['Apples', 'Bananas', 'Carrots', 'Lettuce', 'Tomatoes', 'Potatoes', 'Onions']
            size_options = ['1 lb', '2 lbs', '3 lbs', '5 lbs']
            unit = 'lb'
            price_range = (1.0, 6.0)
        elif category == 'Dairy':
            items = ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Eggs', 'Cream']
            size_options = ['16 oz', '32 oz', '1 gallon', '12 count']
            unit = random.choice(['oz', 'gallon', 'count'])
            price_range = (2.0, 8.0)
        else:
            items = [fake.word().title() for _ in range(10)]
            size_options = ['12 oz', '16 oz', '24 oz', '32 oz']
            unit = 'oz'
            price_range = (1.5, 12.0)
        
        name = random.choice(items)
        size = random.choice(size_options)
        
        products.append({
            'product_id': start_id + i,
            'product_name': f"{brand} {name}",
            'category': category,
            'brand': brand,
            'size': size,
            'unit': unit,
            'price_per_unit': round(random.uniform(*price_range), 2)
        })
    
    return products

def generate_fallback_products(products_per_category=100):
    """
    Fallback method to generate products if API fails completely
    """
    categories = ['Produce', 'Dairy', 'Bakery', 'Meat & Seafood', 'Pantry Staples', 'Snacks', 'Beverages', 'Household']
    
    all_products = []
    product_id = 1
    
    for category in categories:
        category_products = generate_fallback_batch(category, products_per_category, product_id)
        all_products.extend(category_products)
        product_id += products_per_category
    
    return pd.DataFrame(all_products)

def generate_users():
    """Generate users dataset"""
    print("Generating users...")
    
    users = []
    dietary_preferences = ['none', 'vegetarian', 'gluten-free', 'vegan']
    shopping_days = ['Saturday', 'Sunday', 'Monday', 'Wednesday']
    
    for i in range(1, 101):  # 100 users
        users.append({
            'user_id': i,
            'household_size': random.randint(1, 5),
            'dietary_preference': random.choice(dietary_preferences),
            'primary_shopping_day': random.choice(shopping_days)
        })
    
    return pd.DataFrame(users)

def generate_orders(users_df):
    """Generate orders dataset"""
    print("Generating orders...")
    
    orders = []
    delivery_methods = ['pickup', 'delivery']
    time_windows = ['9am-11am', '11am-1pm', '3pm-5pm', '5pm-7pm']
    
    # Map day names to weekday numbers
    day_mapping = {
        'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
        'Friday': 4, 'Saturday': 5, 'Sunday': 6
    }
    
    # Generate orders over the last 2 years
    end_date = datetime.now()
    start_date = end_date - timedelta(days=730)
    
    for order_id in range(1, 2001):  # 2,000 orders
        user_id = random.randint(1, 100)
        user = users_df[users_df['user_id'] == user_id].iloc[0]
        preferred_day = user['primary_shopping_day']
        preferred_weekday = day_mapping[preferred_day]
        
        # Generate timestamp clustered around user's preferred shopping day
        if random.random() < 0.7:  # 70% chance on preferred day
            # Find a date that matches the preferred weekday
            random_date = fake.date_time_between(start_date=start_date, end_date=end_date)
            days_ahead = (preferred_weekday - random_date.weekday()) % 7
            if days_ahead == 0:
                target_date = random_date
            else:
                target_date = random_date + timedelta(days=days_ahead)
        else:
            # Random day
            target_date = fake.date_time_between(start_date=start_date, end_date=end_date)
        
        orders.append({
            'order_id': order_id,
            'user_id': user_id,
            'order_timestamp': target_date,
            'delivery_method': random.choice(delivery_methods),
            'delivery_time_window': random.choice(time_windows)
        })
    
    return pd.DataFrame(orders)

def create_product_affinities(products_df):
    """
    Create product affinity groups for realistic shopping baskets
    """
    affinity_groups = {}
    
    # Group products by category for easier affinity mapping
    by_category = products_df.groupby('category')
    
    for category, group in by_category:
        category_products = group['product_id'].tolist()
        
        if category == 'Pantry Staples':
            # Pasta sauce goes with pasta, etc.
            pasta_products = [p for p in group['product_id'] if 'pasta' in group[group['product_id'] == p]['product_name'].iloc[0].lower()]
            sauce_products = [p for p in group['product_id'] if 'sauce' in group[group['product_id'] == p]['product_name'].iloc[0].lower()]
            
            affinity_groups['pasta_meal'] = pasta_products + sauce_products
        
        elif category == 'Dairy':
            # Milk goes with cereal, cheese with crackers
            milk_products = [p for p in group['product_id'] if 'milk' in group[group['product_id'] == p]['product_name'].iloc[0].lower()]
            cheese_products = [p for p in group['product_id'] if 'cheese' in group[group['product_id'] == p]['product_name'].iloc[0].lower()]
            
            affinity_groups['breakfast'] = milk_products
            affinity_groups['snacks'] = cheese_products
        
        elif category == 'Produce':
            # Fruits and vegetables often bought together
            affinity_groups['healthy'] = category_products
        
        elif category == 'Snacks':
            # Snacks often bought together
            affinity_groups['snack_time'] = category_products
    
    return affinity_groups

def generate_order_items(orders_df, products_df, users_df):
    """
    Generate order items with realistic purchasing patterns and affinities
    Now uses substitution map for realistic substitutions
    """
    print("Generating order items with purchasing affinities and smart substitutions...")
    
    order_items = []
    affinity_groups = create_product_affinities(products_df)
    
    # Get global substitution map
    global SUBSTITUTION_MAP
    substitution_map = globals().get('SUBSTITUTION_MAP', {})
    
    for _, order in orders_df.iterrows():
        order_id = order['order_id']
        user_id = order['user_id']
        
        # Get user info for household size influence
        user_info = users_df[users_df['user_id'] == user_id].iloc[0]
        household_size = user_info['household_size']
        dietary_preference = user_info['dietary_preference']
        
        # Determine basket size (5-25 items, influenced by household size)
        base_basket_size = random.randint(5, 15)
        household_multiplier = 1 + (household_size - 1) * 0.3
        basket_size = int(base_basket_size * household_multiplier)
        basket_size = min(basket_size, 25)  # Cap at 25
        
        selected_products = set()
        
        # Start with some random products
        random_products = random.sample(products_df['product_id'].tolist(), 
                                      min(basket_size // 2, len(products_df)))
        selected_products.update(random_products)
        
        # Add products based on affinities
        for group_name, group_products in affinity_groups.items():
            if any(p in selected_products for p in group_products):
                # If we already have a product from this group, add more from the same group
                additional = random.sample(group_products, 
                                         min(random.randint(1, 3), len(group_products)))
                selected_products.update(additional)
        
        # Ensure we have enough products
        while len(selected_products) < basket_size:
            remaining = basket_size - len(selected_products)
            additional = random.sample(
                [p for p in products_df['product_id'].tolist() if p not in selected_products],
                min(remaining, len(products_df) - len(selected_products))
            )
            selected_products.update(additional)
        
        # Trim to exact basket size
        selected_products = list(selected_products)[:basket_size]
        
        # Generate order items with smart substitutions
        for product_id in selected_products:
            # Quantity influenced by household size
            base_quantity = 1
            if household_size > 2:
                if random.random() < 0.4:  # 40% chance for larger quantities
                    base_quantity = random.randint(2, household_size)
            
            # Some products naturally have higher quantities (like produce)
            product_info = products_df[products_df['product_id'] == product_id].iloc[0]
            if product_info['category'] in ['Produce', 'Snacks']:
                if random.random() < 0.3:
                    base_quantity += random.randint(1, 2)
            
            # Determine substitution - use substitution map if available
            was_substituted = False
            if random.random() < 0.05:  # 5% substitution rate
                if product_id in substitution_map and substitution_map[product_id]:
                    # Smart substitution: replace with similar product
                    substitute_id = random.choice(substitution_map[product_id])
                    # Update the product_id to the substitute
                    product_id = substitute_id
                was_substituted = True
            
            order_items.append({
                'order_id': order_id,
                'product_id': product_id,
                'quantity': base_quantity,
                'was_substituted': was_substituted
            })
    
    return pd.DataFrame(order_items)

def main():
    """Main function to generate all datasets"""
    print("Starting grocery shopping dataset generation...")
    
    # Configuration parameters
    PRODUCTS_PER_CATEGORY = 50        # Configurable: products per category
    BATCH_SIZE = 30                    # Configurable: batch size for API calls
    SIMILAR_BATCH_PCT = 0.6           # Configurable: 60% of each batch selected for similarity
    SIMILAR_SUBSET_PCT = 0.4          # Configurable: 40% of selected products get variants
    
    print(f"Configuration:")
    print(f"  Products per category: {PRODUCTS_PER_CATEGORY}")
    print(f"  Batch size: {BATCH_SIZE}")
    print(f"  Similar product generation: {SIMILAR_BATCH_PCT*100:.0f}% batch selection, {SIMILAR_SUBSET_PCT*100:.0f}% get variants")
    
    # Check if OpenAI API key is available
    if not os.getenv('OPENAI_API_KEY'):
        print("Warning: OPENAI_API_KEY environment variable not set.")
        print("Please set it with: export OPENAI_API_KEY='your-api-key-here'")
        print("Proceeding with fallback product generation...")
    
    # Generate all datasets
    users_df = generate_users()
    products_df = generate_products_via_api(PRODUCTS_PER_CATEGORY, BATCH_SIZE, SIMILAR_BATCH_PCT, SIMILAR_SUBSET_PCT)
    orders_df = generate_orders(users_df)
    order_items_df = generate_order_items(orders_df, products_df, users_df)
    
    # Save to CSV files
    print("Saving datasets to CSV files...")
    users_df.to_csv('users.csv', index=False)
    products_df.to_csv('products.csv', index=False)
    orders_df.to_csv('orders.csv', index=False)
    order_items_df.to_csv('order_items.csv', index=False)
    
    # Print summary statistics
    print("\n=== Dataset Generation Complete ===")
    print(f"Users: {len(users_df)} records")
    print(f"Products: {len(products_df)} records ({PRODUCTS_PER_CATEGORY} per category)")
    print(f"Orders: {len(orders_df)} records")
    print(f"Order Items: {len(order_items_df)} records")
    
    # Get global substitution map for reporting
    global SUBSTITUTION_MAP
    substitution_map = globals().get('SUBSTITUTION_MAP', {})
    
    print(f"\nSubstitution tracking:")
    print(f"  Products with similar variants: {len(substitution_map)}")
    total_variants = sum(len(variants) for variants in substitution_map.values())
    print(f"  Total similar products created: {total_variants}")
    
    substituted_items = order_items_df['was_substituted'].sum()
    print(f"  Items marked as substituted in orders: {substituted_items}")
    
    print(f"\nAverage items per order: {len(order_items_df) / len(orders_df):.1f}")
    print(f"Product category distribution:")
    print(products_df['category'].value_counts())
    
    print(f"\nPrice range by category:")
    price_summary = products_df.groupby('category')['price_per_unit'].agg(['min', 'max', 'mean']).round(2)
    print(price_summary)
    
    print("\nFiles generated:")
    print("- users.csv")
    print("- products.csv") 
    print("- orders.csv")
    print("- order_items.csv")

    # Save to CSV files
    print("Saving datasets to CSV files...")
    users_df.to_csv('users.csv', index=False)
    products_df.to_csv('products.csv', index=False)
    orders_df.to_csv('orders.csv', index=False)
    order_items_df.to_csv('order_items.csv', index=False)
    
    # Print summary statistics
    print("\n=== Dataset Generation Complete ===")
    print(f"Users: {len(users_df)} records")
    print(f"Products: {len(products_df)} records ({PRODUCTS_PER_CATEGORY} per category)")
    print(f"Orders: {len(orders_df)} records")
    print(f"Order Items: {len(order_items_df)} records")
    
    print(f"\nAverage items per order: {len(order_items_df) / len(orders_df):.1f}")
    print(f"Product category distribution:")
    print(products_df['category'].value_counts())
    
    print(f"\nPrice range by category:")
    price_summary = products_df.groupby('category')['price_per_unit'].agg(['min', 'max', 'mean']).round(2)
    print(price_summary)
    
    print("\nFiles generated:")
    print("- users.csv")
    print("- products.csv") 
    print("- orders.csv")
    print("- order_items.csv")

if __name__ == "__main__":
    main()
