import os
import csv
import random
import glob

class QuestionBankService:
    BASE_DIR = r"d:\HackByte\LeetCode-Questions-CompanyWise-master\LeetCode-Questions-CompanyWise-master"

    @classmethod
    def get_random_question(cls, company_name: str) -> dict:
        """
        Scans the massive company-wise dataset natively and retrieves a randomly selected
        high-frequency Medium or Hard DSA question dynamically mapping to the target company.
        """
        if not company_name or not company_name.strip():
            company_name = "google" # Default fallback for missing data

        # Normalize the name for file schema (e.g. "Goldman Sachs" -> "goldman-sachs")
        normalized_name = company_name.lower().strip().replace(" ", "-")
        
        # Scrape folder for relevant matching datasets
        search_pattern = os.path.join(cls.BASE_DIR, f"{normalized_name}*.csv")
        matching_files = glob.glob(search_pattern)

        # Fallback to an industry standard if they input a non-existent company
        if not matching_files:
            search_pattern = os.path.join(cls.BASE_DIR, "google*.csv")
            matching_files = glob.glob(search_pattern)

        if not matching_files:
            # Absolute fallback if the filesystem is unexpectedly inaccessible
            return {
                "title": "Two Sum", 
                "difficulty": "Easy", 
                "link": "https://leetcode.com/problems/two-sum"
            }

        # Prioritize exhaustive 'alltime' files over minor 6-month dumps
        target_file = matching_files[0]
        for f in matching_files:
            if "alltime" in f:
                target_file = f
                break

        # Safely parse matching file via dict mapping
        questions = []
        try:
            with open(target_file, mode='r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    diff = row.get("Difficulty", "").strip()
                    # Isolate filtering to Medium and Hard to enforce true hackathon technical difficulty
                    if diff in ["Medium", "Hard"]:
                        questions.append({
                            "title": row.get("Title", "Unknown LeetCode Problem"),
                            "difficulty": diff,
                            "link": row.get("Leetcode Question Link", "").strip()
                        })
        except Exception as e:
            print(f"Error intercepting dataset CSV: {e}")
            pass

        # Native fallback mechanism
        if not questions:
            return {
                "title": "Reverse Linked List", 
                "difficulty": "Easy", 
                "link": "https://leetcode.com/problems/reverse-linked-list"
            }

        return random.choice(questions)
