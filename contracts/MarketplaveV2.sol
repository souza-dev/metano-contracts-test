// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DcollectiblesMarketPlace is ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _itemIds;
    Counters.Counter private _itemsSold;
    
    address public owner;
    address tokenAddress = address(0);
    uint256 public listingPrice = 0;

    enum State { Created, Sold }

    constructor(address tokenAddr) {
        owner = msg.sender;
        tokenAddress = tokenAddr;
    }
     
     struct MarketItem {
         uint itemId;
         address nftContract;
         uint256 tokenId;
         address seller;
         address owner;
         uint256 price;
         State state;
     }
     
     mapping(uint256 => MarketItem) private idToMarketItem;
     
     event MarketItemCreated (
        uint indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        State state
     );
     
     event MarketItemSold (
         uint indexed itemId,
         address owner
         );

     event MarketItemDeleted (
         uint indexed itemId,
         address owner
         );
    
    function createMarketItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
        ) public nonReentrant {
            require(price > 0, "Price must be greater than 0");
            require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "must be the owner");
            require(IERC20(tokenAddress).balanceOf(msg.sender) >= listingPrice , "Insuficent funds for listing");

            _itemIds.increment();
            uint256 itemId = _itemIds.current();
  
            idToMarketItem[itemId] =  MarketItem(
                itemId,
                nftContract,
                tokenId,
                msg.sender,
                address(0),
                price,
                State.Created
            );
            
            IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
            IERC20(tokenAddress).transferFrom(msg.sender, owner, listingPrice);

            emit MarketItemCreated(
                itemId,
                nftContract,
                tokenId,
                msg.sender,
                address(0),
                price,
                State.Created
            );
        }

    function deleteMarketItem(uint256 itemId) public nonReentrant {
        require(itemId <= _itemIds.current(), "id must <= item count");
        require(idToMarketItem[itemId].state == State.Created, "item must be on market");
        require(idToMarketItem[itemId].seller == msg.sender, "must be the owner");
        
        emit MarketItemDeleted(
                itemId,
                msg.sender
                );

        MarketItem storage item = idToMarketItem[itemId];

        IERC721(item.nftContract).transferFrom(address(this), msg.sender, idToMarketItem[itemId].tokenId);

        delete idToMarketItem[itemId];
    }
        
    function createMarketSale(
        address nftContract,
        uint256 itemId
        ) public nonReentrant {
            uint price = idToMarketItem[itemId].price;
            uint tokenId = idToMarketItem[itemId].tokenId;
            State state = idToMarketItem[itemId].state;
            require(IERC20(tokenAddress).balanceOf(msg.sender) >= price, "Please submit the asking price in order to complete the purchase");
            require(state == State.Created, "This Sale has alredy finnished");
            emit MarketItemSold(
                itemId,
                msg.sender
                );
            IERC20(tokenAddress).transferFrom(msg.sender, idToMarketItem[itemId].seller, price);
            IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
            idToMarketItem[itemId].owner = msg.sender;
            _itemsSold.increment();
            idToMarketItem[itemId].state = State.Sold;
        }


    function fetchActiveItems() public view returns (MarketItem[] memory) {
        return fetchHepler(FetchOperator.ActiveItems);
    }

    function fetchMyPurchasedItems() public view returns (MarketItem[] memory) {
        return fetchHepler(FetchOperator.MyPurchasedItems);
    }

  
    function fetchMyCreatedItems() public view returns (MarketItem[] memory) {
        return fetchHepler(FetchOperator.MyCreatedItems);
    }

    enum FetchOperator { ActiveItems, MyPurchasedItems, MyCreatedItems}


    function fetchHepler(FetchOperator _op) private view returns (MarketItem[] memory) {     
        uint total = _itemIds.current();

        uint itemCount = 0;
        for (uint i = 1; i <= total; i++) {
        if (isCondition(idToMarketItem[i], _op)) {
            itemCount ++;
        }
        }

        uint index = 0;
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint i = 1; i <= total; i++) {
        if (isCondition(idToMarketItem[i], _op)) {
            items[index] = idToMarketItem[i];
            index ++;
        }
        }
        return items;
    } 

    function isCondition(MarketItem memory item, FetchOperator _op) private view returns (bool){
        if(_op == FetchOperator.MyCreatedItems){ 
        return 
            (item.seller == msg.sender)? true
            : false;
        }else if(_op == FetchOperator.MyPurchasedItems){
        return
            (item.owner ==  msg.sender) ? true: false;
        }else if(_op == FetchOperator.ActiveItems){
        return 
            (item.owner == address(0) 
            && item.state == State.Created
            && item.seller != address(0)
            )? true
            : false;
        }else{
        return false;
        }
    }  
}