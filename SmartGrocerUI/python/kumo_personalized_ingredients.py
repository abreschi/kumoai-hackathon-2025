#!/usr/bin/env python3
"""
KumoRFM Personalized Ingredient Ranking
Creates specific Kumo graphs for ingredient personalization
"""

import pandas as pd
import json
import sys
import os
import contextlib
import warnings
from typing import Dict, List, Any

# Import Kumo AI RFM module
try:
    import kumoai.experimental.rfm as rfm
    KUMO_AVAILABLE = True
except ImportError:
    KUMO_AVAILABLE = False
    print("Warning: Kumo AI SDK not installed", file=sys.stderr)


class PersonalizedIngredientRanker:
    
    def __init__(self, data_dir: str = "client/src/data"):
        self.data_dir = data_dir
        self.graph = None
        self.model = None
        self.users_df = None
        self.products_df = None
        self.orders_df = None
        self.order_items_df = None
        
        # Initialize Kumo RFM if available
        if KUMO_AVAILABLE:
            try:
                warnings.filterwarnings("ignore")
                rfm.init()
                print("Kumo AI RFM initialized for personalized ingredients", file=sys.stderr)
            except Exception as e:
                print(f"Kumo RFM initialization issue: {e}", file=sys.stderr)

    def load_csv_data(self):
        """Load all CSV data required for RFM model"""
        try:
            self.users_df = pd.read_csv(os.path.join(self.data_dir, "users.csv"))
            self.products_df = pd.read_csv(os.path.join(self.data_dir, "products.csv"))
            self.orders_df = pd.read_csv(os.path.join(self.data_dir, "orders.csv"))
            self.order_items_df = pd.read_csv(os.path.join(self.data_dir, "order_items.csv"))

            # Prepare orders data with days_since_today
            today = pd.Timestamp.today()
            self.orders_df["days_since_today"] = (today - pd.to_datetime(
                self.orders_df["order_timestamp"])).dt.days.abs()

            print(f"Loaded data for personalized ranking", file=sys.stderr)
            return True
        except Exception as e:
            print(f"Error loading CSV data: {e}", file=sys.stderr)
            return False

    def create_personalized_kumo_graph(self, product_ids: List[int]):
        """Create Kumo graph filtering to specific products"""
        if not KUMO_AVAILABLE:
            return False

        try:
            # Filter order_items to only include the specific products
            filtered_order_items = self.order_items_df[
                self.order_items_df.product_id.isin(product_ids)
            ].copy()
            
            # Create order_items join with filtered data
            order_items_join = self.orders_df.merge(filtered_order_items)
            
            with contextlib.redirect_stdout(sys.stderr):
                # Create graph using filtered data
                self.graph = rfm.LocalGraph.from_data({
                    "users": self.users_df,
                    "products": self.products_df,
                    "orders": self.orders_df,
                    "order_items": order_items_join,
                })

                # Initialize KumoRFM model
                self.model = rfm.KumoRFM(self.graph)

            print(f"Created personalized Kumo graph for {len(product_ids)} products", file=sys.stderr)
            return True

        except Exception as e:
            print(f"Error creating personalized Kumo graph: {e}", file=sys.stderr)
            return False

    def rank_products_for_user(self, product_ids: List[int], user_id: int) -> List[Dict]:
        """Use KumoRFM to rank specific products for a user"""
        if not self.model or not KUMO_AVAILABLE:
            # Fallback: return products in original order with rank
            results = []
            for i, product_id in enumerate(product_ids):
                product_row = self.products_df[self.products_df['product_id'] == product_id]
                if not product_row.empty:
                    product = product_row.iloc[0]
                    results.append({
                        "product_id": int(product_id),
                        "product_name": str(product['product_name']),
                        "brand": str(product['brand']),
                        "category": str(product['category']),
                        "size": str(product['size']),
                        "unit": str(product['unit']),
                        "price_per_unit": float(product['price_per_unit']),
                        "kumo_rank": i + 1  # Fallback ranking
                    })
            return results

        try:
            # Create ranking query for these specific products
            product_list = ','.join(map(str, product_ids))
            ranking_query = f"PREDICT LIST_DISTINCT(order_items.product_id, 0, 30, days) RANK TOP {len(product_ids)} FOR users.user_id = {user_id}"

            with contextlib.redirect_stdout(sys.stderr):
                prediction_result = self.model.predict(ranking_query)
                ranked_product_ids = prediction_result.CLASS

            # Create results with Kumo ranking
            results = []
            for i, product_id in enumerate(ranked_product_ids):
                if product_id in product_ids:
                    product_row = self.products_df[self.products_df['product_id'] == product_id]
                    if not product_row.empty:
                        product = product_row.iloc[0]
                        results.append({
                            "product_id": int(product_id),
                            "product_name": str(product['product_name']),
                            "brand": str(product['brand']),
                            "category": str(product['category']),
                            "size": str(product['size']),
                            "unit": str(product['unit']),
                            "price_per_unit": float(product['price_per_unit']),
                            "kumo_rank": i + 1  # Kumo ranking
                        })

            # Add any missing products that weren't ranked by Kumo
            ranked_ids = {result["product_id"] for result in results}
            for product_id in product_ids:
                if product_id not in ranked_ids:
                    product_row = self.products_df[self.products_df['product_id'] == product_id]
                    if not product_row.empty:
                        product = product_row.iloc[0]
                        results.append({
                            "product_id": int(product_id),
                            "product_name": str(product['product_name']),
                            "brand": str(product['brand']),
                            "category": str(product['category']),
                            "size": str(product['size']),
                            "unit": str(product['unit']),
                            "price_per_unit": float(product['price_per_unit']),
                            "kumo_rank": len(results) + 1  # Lower priority
                        })

            print(f"Kumo RFM ranked {len(results)} ingredients for user {user_id}", file=sys.stderr)
            return results

        except Exception as e:
            print(f"Kumo RFM ranking failed: {e}", file=sys.stderr)
            # Fallback ranking
            results = []
            for i, product_id in enumerate(product_ids):
                product_row = self.products_df[self.products_df['product_id'] == product_id]
                if not product_row.empty:
                    product = product_row.iloc[0]
                    results.append({
                        "product_id": int(product_id),
                        "product_name": str(product['product_name']),
                        "brand": str(product['brand']),
                        "category": str(product['category']),
                        "size": str(product['size']),
                        "unit": str(product['unit']),
                        "price_per_unit": float(product['price_per_unit']),
                        "kumo_rank": i + 1
                    })
            return results


def main():
    """Main function to handle personalized ingredient ranking"""
    if len(sys.argv) < 3:
        print("Usage: python kumo_personalized_ingredients.py <product_ids_json> <user_id>", file=sys.stderr)
        sys.exit(1)

    try:
        product_ids = json.loads(sys.argv[1])
        user_id = int(sys.argv[2])
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Invalid arguments: {e}", file=sys.stderr)
        sys.exit(1)

    # Initialize ranker and load data
    ranker = PersonalizedIngredientRanker()
    
    if not ranker.load_csv_data():
        sys.exit(1)

    # Create personalized Kumo graph
    ranker.create_personalized_kumo_graph(product_ids)

    # Get personalized ranking
    ranked_products = ranker.rank_products_for_user(product_ids, user_id)

    # Output results as JSON
    print(json.dumps(ranked_products, indent=2))


if __name__ == "__main__":
    main()